# CODEBASE_MAP.md — navigable module index

Start at [CLAUDE.md](CLAUDE.md). Endpoint shapes: [API_CONTRACTS.md](API_CONTRACTS.md).

## Data flow (request path)

```
Browser
  │
  ▼
apps/web/src/app/*  (server components: /, /shop, /products/[handle])
  │  all fetching goes through ONE file:
  ▼
apps/web/src/services/medusa.ts
  │  raw fetch  GET /homepage            (public, no key)
  │  JS SDK     GET /store/{products,collections,product-categories}
  ▼                                       (x-publishable-api-key header)
apps/backend  (Medusa v2, :9000)
  ├─ src/api/homepage            → public homepage settings
  ├─ src/api/admin/homepage      → GET/POST upsert (admin session)
  ├─ src/modules/homepage        → HomepageSetting model + auto-CRUD service
  └─ built-in Medusa store/admin APIs
  ▼
PostgreSQL (Neon)

Separate loop: Medusa Admin (:9000/app) → src/admin/routes/homepage/page.tsx
edits settings + postMessage('UPDATE_PREVIEW') → storefront Home.tsx iframe.
```

## apps/web (storefront) — details in `apps/web/CLAUDE.md`

| Module | Path | Notes |
|---|---|---|
| Routes | `src/app/` | `layout.tsx` wraps everything in `GlobalShell`; pages: `/`, `/shop`, `/products/[handle]`. No loading/error/not-found files yet |
| API client | `src/services/medusa.ts` | Only file reading `process.env`; exports `sdk`, `BACKEND_URL`, 5 fetch helpers |
| home feature | `src/features/home/` | `Home.tsx` (client, preview listener) + 9 section components; has MODULE.md |
| layout feature | `src/features/layout/` | `GlobalShell` = TopBanner+Header+CategoryNav+Footer; has MODULE.md |
| shop feature | `src/features/shop/` | `Shop.tsx` client listing w/ category filter; has MODULE.md |
| product feature | `src/features/product/` | `ProductDetails.tsx` PDP; has MODULE.md |
| shared UI | `src/components/ui/button.tsx` | Only shadcn component; currently imported nowhere |
| utils | `src/lib/utils.ts` | `cn()` |
| empty scaffolds | `src/hooks`, `src/store`, `src/types`, `src/components/shared` | Empty dirs — intended homes for future hooks/zustand/types/shared components |

Cross-feature edge: `ProductCard` lives in `features/home/components/` but is
imported by shop and product features too — it's the de-facto shared card.

## apps/backend (Medusa) — details in `apps/backend/CLAUDE.md`

| Module | Path | Notes |
|---|---|---|
| Config | `medusa-config.ts` | DB/CORS/secrets + registers homepage module. No Redis/file/payment providers |
| homepage module | `src/modules/homepage/` | model, `MedusaService` auto-CRUD, generated migration |
| API routes | `src/api/{homepage,admin/homepage,admin/custom,store/custom}` | See API_CONTRACTS.md; `*/custom` are dead stubs |
| Admin UI | `src/admin/routes/homepage/page.tsx` | CMS form + live-preview iframe (src hardcoded `http://localhost:3000`) |
| Seeds/ops | `src/migration-scripts/`, `update-images.ts` | `initial-data-seed.ts` is the wired seed; `seed-products.ts` is a divergent duplicate — don't run both |
| jobs/links/subscribers/workflows | `src/*/` | README-only placeholders, no code |

## Docs map

| Doc | Role |
|---|---|
| `CLAUDE.md` | Canonical agent instructions (root) |
| `apps/{web,backend}/CLAUDE.md` | Per-app agent instructions |
| `apps/web/src/features/*/MODULE.md` | Per-feature memory (protocol: `.agents/AGENTS.md`) |
| `BACKEND_PLAN.md` / `FRONTEND_PLAN.md` | 2026-07 audits: known bugs, security issues, fix order |
| `Mithra_*.md` | Original vision specs — aspirational only |
