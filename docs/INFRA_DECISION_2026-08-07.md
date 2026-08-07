# Infrastructure: where to run things, and Neon vs Supabase

**Date:** 2026-08-07
**Question asked:** should we move the frontend and backend into the same tenant,
and should we switch from Neon to Supabase?

---

## 1. Short answers

**Neon vs Supabase is the wrong question.** The 290 ms you are paying per
database query is **distance, not vendor**. Moving from Neon to Supabase while
the database stays on a different continent from the backend changes nothing —
you would spend a migration and land on the same number. Both are good managed
Postgres. Pick either, but pick the *region* deliberately.

**"Same tenant" is also not quite the goal — same _region_ is.** Putting the
storefront on Railway next to the backend would cost you Vercel's edge network
and Next.js build integration, and the Vercel↔Railway hop was already measured
and ruled out as a bottleneck (`AUDIT_2026-08-01_FRONTEND_PERF.md` §9b). The hop
that actually hurts is **backend ↔ database**.

---

## 2. The measurement this rests on

```
/health        (no database)                0.31 s   ← network + app baseline
/store/regions (one 1-row table)            0.62 s
                                            ------
one database round trip                    ~0.29 s
```

**290 ms for a single query against a one-row table.** A same-region app→DB
round trip is **1–3 ms**. That is ~100× overhead, and it is geography:

- Neon database region: **`us-east-1`** (AWS N. Virginia)
- Railway edge: **`sin1`** (Singapore) — `x-railway-edge` header
- Vercel functions: **`iad1`** (Virginia) — `x-vercel-id: bom1::iad1`

`/store/products` at 2.3 s is ~0.31 s of baseline plus roughly 7 sequential
queries. Seven queries is normal for Medusa loading products, variants, prices,
price rules, inventory, options and images. **The queries are not the bug.
Paying 290 ms for each one is.**

Today a single product listing crosses the Pacific about seven times.

---

## 3. Recommendation, ranked

### Option A — Railway Postgres, same Railway region as the backend ✅ recommended

Round trips drop to **~1 ms**. Nothing else comes close, because the database
lives inside the same private network as the container.

- `/store/products` **2.3 s → ~0.35 s**, no code change
- Removes Neon from the bill entirely
- One vendor, one dashboard, private networking, no egress between app and DB

Trade-offs to accept knowingly: no database branching, and backups are something
**you must configure and verify** rather than something you inherit. For a store
this size that is a fair trade, but do not skip the backup step.

### Option B — keep Neon, move it (or the backend) so they match

Round trips ~1–5 ms. Keeps Neon's branching, autoscaling and generous free tier.
Neon projects cannot change region, so this means creating a new project in the
backend's region and migrating — or moving the Railway service to `us-east`,
which is the cheaper move since Neon is already in `us-east-1`.

**This is the smallest possible change: set the Railway service region to a US
East one and redeploy.** If you want the win today with the least risk, do this.

### Option C — Supabase

Fine, but it buys you nothing *here*. Supabase's value is auth, storage,
realtime and its REST/JS client. **Medusa uses none of them** — it needs plain
Postgres and runs its own auth, storage and migrations. You would be adopting a
platform for features the application will never call.

Two things worth knowing before choosing it anyway:

- Supabase's pooler in transaction mode breaks DDL and prepared statements, so
  migrations need the **direct** connection string — exactly the same
  constraint Neon has, which is why `DATABASE_URL_DIRECT` already exists in this
  repo. No advantage.
- Your other app performing well on Supabase is most likely co-location plus a
  different access pattern (HTTP client from the edge, not a long-lived
  Postgres connection from a container). It is not evidence that Supabase is
  faster for Medusa.

If you prefer Supabase for operational reasons — you already know the dashboard,
one less vendor to learn — that is a legitimate reason. Just put it in the
backend's region, and expect the same performance as Option B.

### Target topology

```
Shopper → Vercel edge (nearest POP)
        → Vercel function  iad1   (US East)
        → Railway backend  us-east
        → Postgres         us-east      ← all three within ~10 ms
```

---

## 4. What NOT to do

- **Do not move the storefront off Vercel to "be near the backend."** Measured
  and ruled out (§9b). You would lose the edge network and Next's build
  integration to fix a hop that costs tens of milliseconds.
- **Do not switch database vendors as a performance fix.** If the region is
  wrong, every vendor is slow. If the region is right, every vendor is fast.
- **Do not raise the `/store/*` rate limit** to compensate. It is IP-keyed and
  structurally wrong; a bigger number makes it worse.

---

## 5. Sequencing

1. **Set the Railway service region to US East** (matches Neon `us-east-1` and
   Vercel `iad1`). Redeploy. Re-measure `/health` vs `/store/regions` — the
   delta should collapse from ~290 ms to single digits.
2. **Re-measure `/store/products`.** Expect ~0.35 s. If it is still seconds,
   *then* there is a genuine N+1 inside Medusa worth hunting — and with a fast
   link it will finally be visible.
3. Only then consider Option A (Railway Postgres) as a further consolidation,
   or leave Neon alone if step 1 got you where you need to be.

Step 1 is a dropdown and a redeploy. Do it before anything else.
