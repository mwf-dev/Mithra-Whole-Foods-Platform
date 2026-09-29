# Railway cost audit — why the backend bills money with no traffic

**Date:** 2026-08-06
**Trigger:** Railway credit draining (`3 days or $1.89 left`) while the backend
has served effectively no requests for ~1–2 weeks.
**Scope:** Railway service `Mithra-WholeFoods`, deploy `4496edbf` (2026-07-30),
`numReplicas: 1`.

---

## 1. Headline finding

**Nothing is wrong with your request volume. Railway does not bill per request.**

Railway meters **allocated RAM × time** and **vCPU × time** for every minute the
container is *running*, plus network egress. A Medusa container that serves zero
requests for a month costs almost exactly the same as one that serves ten
thousand. Your credit is being consumed by **uptime**, not by traffic.

So the observation "no requests came in, but I'm still being charged" is not a
symptom of a bug. It is the expected behaviour of the billing model, and it will
behave identically on the client's account unless the service configuration
changes.

The corollary matters for the handover: **moving the project to the client's
Railway account buys 30 more days and then reproduces this exact situation.**
The fix is configuration, not migration.

---

## 2. What I checked, and what it ruled out

I went looking for a runaway loop, an uncontrolled poller, or an unbounded
retry — the things that *would* make this a codebase bug. None of them exist.

| Suspected cause | Verdict | Evidence |
|---|---|---|
| GitHub Actions keep-warm hammering `/health` every 10 min | **Not happening.** The workflow runs but no-ops. | `.github/workflows/keep-warm.yml` requires the repo secret `BACKEND_HEALTHCHECK_URL`; run `31061477784` logs `BACKEND_HEALTHCHECK_URL not set — skipping.` |
| Medusa scheduled jobs / cron | **None exist.** | `apps/backend/src/jobs/` contains only `README.md` |
| Vercel cron pinging the storefront | **None exist.** | No `vercel.json` anywhere in the repo |
| Storefront polling the backend on a timer | **None.** | Only `setInterval` in `apps/web/src` is the hero carousel (`modules/home/components/hero/client.tsx:181`) — DOM only, no network |
| Next middleware firing a backend call per asset request | **No.** | `apps/web/src/middleware.ts:165` excludes `_next/static`, `_next/image`, images, `api`, `health`, `monitoring`; region lookup is memoised for 1h |
| Search index rebuilding constantly | **No.** | `src/lib/product-search.ts:131` — 60s TTL, rebuilt lazily on search only |
| Retry storm from `resilient-fetch` | **No.** | Bounded retries, writes never replayed (except 429) |
| A second billed Railway service (Redis/Postgres) | **No.** | Project canvas shows one service; DB is external (Neon), Redis was removed |

**The deploy logs are the strongest evidence.** Over the whole visible window
the *only* log lines are `Connection Error: Connection ended unexpectedly`, at
exactly 30-minute intervals (07:54, 08:24, 08:54, 09:24, …). No request logs at
all. That regularity is a pooled Postgres connection to Neon being reaped after
idle — see §5. It is a symptom of the backend being *idle*, and it independently
confirms your read of the situation.

---

## 3. So what is actually consuming the credit

A single always-on Node process holding:

- **Medusa 2.17 server** — the framework, all core modules, the ORM and its
  entity metadata. This is the bulk of resident memory and it is resident from
  boot, before a single request arrives.
- **The admin dashboard, served from the same process.** `DISABLE_MEDUSA_ADMIN`
  is not set — verified: `GET /app` on the live service returns `200`. Server
  and admin share one container.
- **`workerMode: "shared"`** (`medusa-config.ts`) — the background worker runs
  inside the same process as the HTTP server, so its schedulers tick regardless
  of traffic.
- **In-memory event bus, workflow engine and locking.** `REDIS_URL` is unset in
  this deployment, so Medusa falls back to local implementations. These are
  polling constructs; they cost a small, *constant* amount of CPU forever.
- **An open Postgres pool to Neon**, re-established every 30 minutes.

None of that is idle-able by Node. It is resident, and Railway charges for
resident.

### The arithmetic

Railway's published rates are roughly **$10 per GB-month of RAM** and **$20 per
vCPU-month**. Working backwards from your own number: if `$1.89` is expected to
last `3 days`, that is **~$0.63/day ≈ $19/month** — consistent with an
always-on container holding on the order of a gigabyte with a small constant CPU
draw. If instead the "3 days" is the trial's calendar limit rather than a burn
projection, the `$5 − $1.89 = $3.11` consumed implies a lower rate. I can't
resolve which from outside the account.

**Get the real split before changing anything:** Railway → Project → **Usage**
(or the service's Metrics tab) breaks the spend into Memory / CPU / Egress /
Build minutes per service. That single screen tells you whether you are paying
for RAM (expected), CPU (would mean something *is* spinning), or egress
(would mean something is transferring). Everything in §4 gets sharper once you
have it.

---

## 4. What to actually do

### 4a. The one change that fixes idle cost — Railway config, not code

**Enable Railway's "Serverless" / app-sleeping on the backend service** while the
store is pre-launch. The container suspends after a few minutes of inactivity and
you stop paying for those minutes. For a service with genuinely zero traffic this
takes idle cost to near zero.

Railway → service → **Settings → Deploy → Serverless** (labelled *App Sleeping*
in some plan views).

The trade-off is real and you should choose it deliberately: the first request
after a sleep pays a full Medusa cold boot, which is slow — `railway.json` sets
`startupTimeoutMillis: 300000` for a reason. That is fine for a store nobody is
visiting yet. It is **not** fine once the client's customers are on the site.

**This is why I did not just delete `keep-warm.yml`.** Keep-warm and
scale-to-zero are mutually exclusive by design. I've added an explicit cost
warning at the top of that workflow so whoever sets `BACKEND_HEALTHCHECK_URL`
later understands they are also opting into a 24/7 bill.

Decision table:

| Phase | Serverless | `BACKEND_HEALTHCHECK_URL` | Idle cost |
|---|---|---|---|
| Now (pre-launch, no users) | **On** | leave unset | ~$0 |
| Live storefront | Off | set | full always-on rate |

### 4b. Cap the Node heap so RSS stops drifting upward

V8 sizes its heap from the machine's available memory, not the container's
budget, and will happily let the resident set grow because collecting is more
expensive than allocating. On a metered host that difference is money.

Set on the Railway service (**not** hard-coded in the Dockerfile — the right
value depends on the plan's memory limit, and guessing too low turns a cost
tweak into an OOM crash loop):

```
NODE_OPTIONS=--max-old-space-size=512
```

Start at 512, watch `rss_mb` from the new `/admin/usage` endpoint (§6) for a day,
and raise it if you see restarts. Do this *after* reading the Usage page — if the
bill turns out to be CPU-dominated, this lever is the wrong one.

### 4c. Before the client's customers arrive: the cost bug that *is* in the code

Idle cost is a configuration problem. **Cost under load is a code problem, and
this repo has a serious one.**

`docs/AUDIT_2026-08-01_FRONTEND_PERF.md` §9 measured `/store/products` with
`calculated_price` at **4.7–10.9 seconds**, against ~220ms for a raw round-trip
to the same Neon database. Under Railway's per-second CPU metering that is not
just a latency complaint — every product-listing view occupies the container for
seconds of billable compute. Compounding it:

- `cart-context.tsx:151` calls `router.refresh()` after every cart mutation,
  costing **~6.5 `/store/*` requests per add-to-cart** (invariant 1 in
  `CLAUDE.md`).
- Every route is dynamic, so nothing is served from cache
  (`(main)/layout.tsx` reads cookies).

Idle, this costs nothing. With real shoppers, it means each visitor is worth
several seconds of billed CPU instead of a few hundred milliseconds. **Fix the
`/store/products` latency before the store goes live on the client's account**,
or the traffic-driven bill will be many times what the traffic justifies.

### 4d. Don't pay for builds you don't need

Railway bills build minutes. `.github/workflows/ci.yml` notes that *"Railway +
Vercel watch `dev`"* — every push to that branch triggers a full Docker rebuild
of a Medusa image. During quiet periods, point Railway at a release branch or
disable auto-deploy rather than rebuilding on every commit.

---

## 5. The 30-minute `Connection ended unexpectedly` log

Benign, and worth understanding so nobody chases it as a bug.

Medusa keeps a `pg` pool open to Neon. Neon's pooler drops connections that have
sat idle, and the driver logs the close as an error before transparently
reconnecting on next use. The precise 30-minute cadence is the tell: real traffic
would produce irregular timing. Nothing is retrying in a loop, and nothing is
failing to recover — the service answers `/health` in ~300ms (measured
2026-08-06, three consecutive probes: 0.35s / 0.40s / 0.30s).

It becomes worth revisiting only if it starts appearing at *sub-minute*
intervals, which would indicate genuine connection churn rather than idle reaping.

---

## 6. New: usage tracking, so this is measurable instead of inferred

You asked to be able to see this rather than guess at it. Added:

| File | What it does |
|---|---|
| `apps/backend/src/lib/request-metrics.ts` | In-process meter: request counts by route family and status class, error/429/slow-request counters, egress bytes, a 60-slot rolling-hour ring buffer, peak req/min, idle seconds — plus RSS, heap and cumulative CPU seconds |
| `apps/backend/src/utils/usage-metrics.ts` | Express middleware that records each completed request |
| `apps/backend/src/api/middlewares.ts` | Registers it globally, first in the chain |
| `apps/backend/src/api/admin/usage/route.ts` | `GET /admin/usage` — admin-authenticated read |
| `apps/backend/src/lib/__tests__/request-metrics.unit.spec.ts` | 16 unit tests |

Deliberately zero-cost: no database writes, no Redis, no external service, fixed
memory regardless of traffic. A meter that shows up on the bill would defeat its
own purpose.

### Reading it

`GET /admin/usage` (from the admin session at `/app`) returns:

```jsonc
{
  "process":   { "uptime_human": "…", "worker_mode": "shared", "admin_ui_served": true },
  "resources": { "rss_mb": 0, "heap_used_mb": 0, "cpu_seconds_total": 0,
                 "avg_vcpu_since_boot": 0 },   // ← what the bill is made of
  "traffic":   { "total_requests": 0, "requests_last_hour": 0,
                 "peak_requests_per_minute_since_boot": 0,
                 "idle_seconds": null,          // null = never served real traffic
                 "by_route_class": {}, "by_status_class": {} }
}
```

Two numbers answer your original question directly:

- **`resources.avg_vcpu_since_boot`** — average fraction of one vCPU used since
  boot. An idle Node server sits near `0.00–0.02`. Anything sustained near `1.0`
  means something *is* spinning and the "no traffic but charged" story has a
  second cause worth hunting.
- **`traffic.idle_seconds`** — seconds since the last non-health request.
  `null` means nothing but uptime probes has ever hit this process. Health
  probes are excluded on purpose; counting them would make an idle backend look
  busy, which is the exact confusion this audit started from.

### Log-based history

Every 15 minutes the process writes one greppable line to the Railway deploy
logs:

```
[usage] uptime=2d 4h 15m rss=412MB heap=180/256MB avg_vcpu=0.012 req_total=94 req_1h=3 peak_rpm=11 idle_s=1840 by_class={"health":61,"store":30,"admin":3}
```

Filter Railway's log search for `[usage]`. That gives you a permanent record of
both traffic *and* resource draw — so next time the question is "was anything
hitting the backend last Tuesday?", it's answerable retroactively instead of by
inference. Counters reset on each deploy; `uptime_human` says how far back they
reach.

### Known blind spot (measured, documented in the source)

Medusa mounts its publishable-key check on `/store/*` and its admin auth on
`/admin/*` **before** anything registered via `defineMiddlewares`. Requests
rejected by those never reach the meter. Verified directly: three `/store/regions`
calls *with* a valid key incremented the counter; one *without* did not.

Practical effect: the meter sees all legitimate traffic, everything hitting the
open surfaces (`/health`, `/homepage`, `/hooks/*`), and 429s from our own rate
limiters — but it will under-count a bot spraying `/store/*` with no key. Those
rejections are cheap (no DB work, negligible bill impact), but don't read
`total_requests` as "every packet that touched the box".

---

## 7. Handover checklist for the client's Railway account

1. Read **Railway → Usage** on the current account first, and note the
   Memory / CPU / Egress / Build split. Transfer without that and you lose the
   baseline.
2. Transfer the project.
3. Enable **Serverless / app sleeping** immediately (§4a) — the new 30 days
   drains the same way otherwise.
4. Leave `BACKEND_HEALTHCHECK_URL` unset until launch day.
5. Set `NODE_OPTIONS=--max-old-space-size=512` and watch `rss_mb` for a day (§4b).
6. Point Railway's auto-deploy at a release branch, not an active dev branch (§4d).
7. **Before launch**, fix the `/store/products` latency (§4c). This is the one
   that turns real customers into a disproportionate bill.
8. Set a **spend limit / usage alert** on the client's Railway account so a
   runaway can never silently drain it.

---

## 8. One-line answer

The backend is billed for existing, not for being used; nothing in the codebase
is looping or leaking; the cure is Railway's scale-to-zero while the store is
quiet, and fixing the 4.7–10.9s product query before it is busy.
