# apps/backend — Medusa v2 backend (`@dtc/backend`)

Medusa 2.17 server: built-in commerce APIs + one custom module (`homepage`
CMS) + a custom admin page with live storefront preview. Serves storefront API
on :9000 and admin UI at :9000/app. Root rules in [/CLAUDE.md](../../CLAUDE.md);
endpoint shapes in [/API_CONTRACTS.md](../../API_CONTRACTS.md).

## Load-bearing files

- `medusa-config.ts` — DB (Neon, `ssl.rejectUnauthorized:false` — known flaw),
  CORS from env, secrets (default to `supersecret` if unset — known flaw),
  registers `./src/modules/homepage`. No Redis/file/payment modules.
- `src/modules/homepage/` — `models/homepage.ts` (HomepageSetting),
  `service.ts` (`MedusaService({ HomepageSetting })` auto-CRUD:
  `listHomepageSettings`, `createHomepageSettings`, `updateHomepageSettings`),
  `index.ts` (module key `"homepage"`), `migrations/` (generated).
- `src/api/homepage/route.ts` — public GET (deliberately outside `/store`).
- `src/api/admin/homepage/route.ts` — GET + POST upsert (unvalidated body).
- `src/admin/routes/homepage/page.tsx` — CMS form; uploads via
  `POST /admin/uploads` (local `static/`); preview iframe hardcodes
  `http://localhost:3000`.
- `src/migration-scripts/initial-data-seed.ts` — the wired seed (`pnpm seed`):
  store/region(INR)/channel/key + 3 categories + `homepage-best-sellers`
  collection + 3 products.
- `jobs/ links/ subscribers/ workflows/` — README-only placeholders.

## Commands

```bash
pnpm --filter @dtc/backend dev        # medusa develop, :9000
pnpm --filter @dtc/backend db:migrate # after any model change
pnpm --filter @dtc/backend seed       # ONCE per fresh DB only — see gotchas
npx medusa exec ./src/migration-scripts/<script>.ts   # from apps/backend/
npx medusa db:generate homepage       # regenerate migration after model edit
```

## Gotchas (verified 2026-07)

- **Seeds are NOT idempotent** — re-running duplicates store/region/collection
  (same handle → homepage best-sellers silently swaps). Never run on a
  non-empty DB. `seed-products.ts` is a divergent unwired duplicate
  (different images, oil `1L` vs `1kg`) — do not run alongside the main seed;
  slated for consolidation (BACKEND_PLAN Module 5).
- **Upsert race**: `POST /admin/homepage` is read-then-write with no
  transaction/constraint; body spread lets a client `id` redirect the update.
- **Envelope inconsistency**: GET → `homepage_settings`, POST →
  `homepage_setting`. Renaming breaks `web/src/services/medusa.ts` and admin
  `page.tsx` — change all three together.
- No `src/api/middlewares.ts` exists; admin protection is Medusa's implicit
  `/admin/*` auth, and there is zero body validation anywhere.
- Uploads land on local disk (`static/`) — ephemeral on Cloud Run until a
  GCS/S3 file module is added.
- `test:integration:*` scripts reference a missing `integration-tests/` dir;
  only `test:unit` can work (no tests written yet).
- `get_key.js`, `test-db.js`, `test-env.js`, tracked `.env.*`: leaked-secret
  cleanup pending (BACKEND_PLAN Critical). Don't copy their pattern.

## Common tasks

- **New endpoint** → `src/api/<scope>/<name>/route.ts` exporting
  `GET/POST(req: MedusaRequest, res: MedusaResponse)`; `/admin/*` auto-authed,
  `/store/*` needs publishable key. Then update `/API_CONTRACTS.md`.
- **Model change** → edit `src/modules/homepage/models/`, run
  `npx medusa db:generate homepage`, then `db:migrate`. Never hand-edit
  committed migrations.
- **New domain concept** → new module under `src/modules/<name>/` mirroring
  homepage's structure; register it in `medusa-config.ts`.

## When editing here, also check/update

- `/API_CONTRACTS.md` for any route/shape change
- `web/src/services/medusa.ts` + `admin/routes/homepage/page.tsx` (the two
  consumers of the homepage endpoints)
- Seed data that the frontend hardcodes: collection handle
  `homepage-best-sellers`, category names, `Weight` option
- `BACKEND_PLAN.md` — mark fixed items so the roadmap stays truthful
