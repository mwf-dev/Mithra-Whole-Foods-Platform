# Internal Developer Portal — infrastructure dashboard

**Built 2026-08-08.** Implements `DEV_ADMIN_DASHBOARD_PLAN.md`. Lives in the
Medusa admin at **Infrastructure** (`/app/platform`).

One screen that answers: *is anything broken, is anything about to cost us
money, and is anything silently switched off* — across Vercel, Railway, Neon,
Cloudinary, Stripe, SendGrid, this backend and the public storefront, without
logging into six dashboards.

Built for the hand-off: the client owns the service accounts, we hold read-only
tokens.

## What it does

| Capability | Where |
|---|---|
| Usage + cost per platform, with run-rate projections | Overview tab |
| Add/rotate/test read-only API tokens without a redeploy | Connections tab |
| Budget ceilings + threshold alerts | `POST /admin/platform/budgets` |
| Alert list, acknowledge/resolve | Alerts tab |
| Live check of every endpoint, config flag and store-readiness item | Verification tab |
| Daily collection + Slack/email digest | `src/jobs/collect-platform-usage.ts`, 06:00 UTC |

## Architecture

```
src/modules/platform-monitor/       4 models: connection, usage_snapshot,
                                    budget, alert  (migration applied 2026-08-08)
src/lib/platform-monitor/
  providers/*.ts                    one adapter per platform
  crypto.ts                         AES-256-GCM for stored tokens
  run-rate.ts                       projection + classification (pure, unit-tested)
  collector.ts                      fetch → snapshot → evaluate alerts
  connections.ts                    stored rows ⇄ adapters, env fallback
  notify.ts                         Slack webhook + SendGrid digest
src/api/admin/platform/**           admin-authed HTTP surface
src/admin/routes/platform/page.tsx  the UI
src/scripts/diagnose-platform-monitor.ts   read-only CLI diagnostic
```

### Adding a platform

Write an adapter implementing `PlatformProvider` (`types.ts`) and add it to the
array in `providers/index.ts`. The UI builds its credential form from
`credential_fields` / `setting_fields`, so **no frontend change is needed**.

## Credentials

Entered in the admin UI, encrypted at rest with AES-256-GCM, never returned to
the browser (only masked previews like `rk_••••••a91f`).

Key material: `PLATFORM_MONITOR_SECRET` → `COOKIE_SECRET` → `JWT_SECRET`.
Rotating it makes stored tokens undecryptable by design — the connection reports
`unconfigured` and you re-enter the token. It never takes the backend down.

**Env vars are a first-class alternative.** Any field with an `env:` falls back
to it, so Cloudinary and Stripe worked with zero setup on the existing
deployment. The UI labels which source each value came from.

## Run-rate maths

`(usage so far ÷ fraction of cycle elapsed)` — deliberately linear. Three rules
keep it honest:

1. **Only cumulative metrics are projected.** Storage and RAM are levels;
   projecting them is meaningless. They're checked at their current value.
2. **Nothing is projected in the first 10% of a cycle.** One afternoon
   extrapolated across a month is noise dressed as a forecast.
3. **A missing value is never zero.** `null` → `unknown`, never a reassuring 0.

`critical` is reserved for *already breached*. A scary projection stays a
`warning` — paging on a guess is how alerts get ignored.

### Metrics with no quota

Booleans and failure counts have no limit to measure against, so they'd classify
as `unknown` and render as calmly as a healthy row. Those declare `alert_when`
instead (`{ below: 1 }` / `{ above: 0 }`), which outranks quota logic. This is
what surfaces "webhook verification is off" and "the storefront is down".

## Alerts

Fingerprinted `provider:metric:severity`. Re-notified at most every 24h.
Acknowledging stops notification without hiding the row; a condition that clears
sets `resolved_at` rather than deleting, so the history survives.

Channels — both optional, both independent:

- `PLATFORM_ALERT_SLACK_WEBHOOK` — **recommended primary.** Needs nothing else.
- `PLATFORM_ALERT_EMAIL` (or `ADMIN_NOTIFICATION_EMAIL`) — requires
  `SENDGRID_API_KEY`, which this project currently does not set. An alerting
  system whose only channel is the one known to be off is decorative.

With neither configured, a pending alert logs a warning rather than vanishing.

## Verification tab

Three families of live check:

1. **Platform connectivity** — one `test()` per provider.
2. **Runtime configuration** — the things that produce no logs but silently
   disable a feature: `STRIPE_WEBHOOK_SECRET`, `SENDGRID_API_KEY`,
   `STOREFRONT_PROXY_SECRET`, `REDIS_URL`, `SENTRY_DSN`, file storage.
3. **Store readiness** — regions, shipping options, stock locations,
   publishable keys, published products, payment providers. A perfectly healthy
   backend with no shipping option is a store that cannot take an order.

## Known limitations (deliberate, not TODOs)

- **Vercel bandwidth/function hours are usually unavailable.** Vercel has no
  stable, documented, plan-independent usage endpoint — the
  `GET /v8/projects/{id}/usage` in the original plan does not exist. The adapter
  reports deployment health from the stable public API, opportunistically tries
  the team usage endpoint, and marks the rest `null` **with the reason** rather
  than showing a zero that reads as "we're using nothing".
- **Railway cost estimates need a team token.** Project-scoped tokens usually
  cannot read `estimatedUsage`; the adapter says so instead of showing $0.
- **Cloudinary does not report its cycle boundaries**, so projections assume a
  calendar month. Flagged as a warning on the provider.
- **Stripe charge counts cap at one page (100).** This is a health signal, not
  an accounting ledger; paginating daily would burn API budget.
- **No retries on vendor calls.** One attempt, 12s timeout. A retry storm
  against a rate-limited vendor is how a monitoring tool gets its own token
  throttled.

## Operating it

```bash
# Read-only: what's configured, live connectivity, latest snapshots, alerts
npx medusa exec ./src/scripts/diagnose-platform-monitor.ts

# Stored state only, no outbound vendor calls
npx medusa exec ./src/scripts/diagnose-platform-monitor.ts -- --no-test
```

Snapshots are pruned after 400 days. A year of daily rows is a few KB per
provider.

## First-run state (verified against the live system, 2026-08-08)

Cloudinary and Stripe connected immediately from existing env vars. Railway,
Neon, Vercel and SendGrid need read-only tokens (Phase 1 of the plan — that's a
client-account task, not a code task).

The first collection raised three alerts, all correct and all previously
invisible:

- **critical** — `STRIPE_WEBHOOK_SECRET` unset: the payment webhook accepts
  unsigned payloads.
- **warning** — no enabled Stripe webhook endpoint: async payment flows leave
  orders stuck pending after a successful charge.
- **critical** — storefront health probe failing (local only; the storefront
  wasn't running).

That is the portal doing its job on day one: the first two are documented gaps
in `/CLAUDE.md` that no dashboard was surfacing.
