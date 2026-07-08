# CLAUDE.md — Mithra Whole Foods (canonical agent instructions)

This is the single source of truth for AI agents. `AGENTS.md`, `AGENT.md`, and
`.agents/AGENTS.md` all defer to this file. Trust the code over any doc; trust
this file over older docs.

## What this app is

Premium grocery & traditional-foods e-commerce platform (India-first, INR).
Next.js 15 storefront + Medusa v2 headless backend with a custom homepage-CMS
module and an admin live-preview page. **Pre-production**: homepage/shop/PDP
browsing works; there is **no cart, auth, checkout, payment, or search yet**
(Header cart badge "3" is hardcoded).

## Tech stack (verified against package.json, 2026-07)

- Monorepo: pnpm 9 workspaces + Turborepo 2.10 (`turbo.json`)
- `apps/web`: Next.js **15.5.20** (App Router, Turbopack), React **19.1.0**,
  TypeScript 5, **Tailwind CSS v4** (theme in `src/app/globals.css`, no
  tailwind.config), shadcn base-nova (only `components/ui/button.tsx`),
  lucide-react, `@medusajs/js-sdk` 2.17
- `apps/backend` (pkg name `@dtc/backend`): **Medusa 2.17.0**, PostgreSQL
  (Neon), Jest configured (no tests written yet)
- Installed in web but **unused — do not assume these patterns exist**:
  zustand, @tanstack/react-query, react-hook-form, zod, framer-motion,
  embla-carousel-react. State today is plain `useState`/`useMemo`.
- **Not present** (older docs claim otherwise): Redis, Cloudinary, Stripe,
  Razorpay, Typesense. Cache/event-bus are in-memory; uploads go to local disk.

## Repo map

| Path | Purpose |
|---|---|
| `apps/web/` | Next.js storefront → see `apps/web/CLAUDE.md` |
| `apps/backend/` | Medusa backend + admin → see `apps/backend/CLAUDE.md` |
| `packages/` | Empty placeholder (future shared packages) |
| `.agents/` | Module-memory protocol for AI agents |
| `CODEBASE_MAP.md` | Module index + frontend↔backend data flow |
| `API_CONTRACTS.md` | Every endpoint: method, path, auth, shapes — read before calling the backend |
| `BACKEND_PLAN.md`, `FRONTEND_PLAN.md` | Current audits + prioritized fix roadmap (2026-07) — authoritative on known bugs |
| `Mithra_*.md` (2 files) | Original vision/spec docs — aspirational, partially outdated |

## Commands (exact)

```bash
pnpm install                      # at repo root (pnpm 9, workspace-aware)
pnpm dev                          # turbo: both apps (web :3000, backend :9000)
pnpm build / pnpm lint / pnpm format
pnpm --filter web dev             # storefront only → http://localhost:3000
pnpm --filter @dtc/backend dev    # backend only → :9000, admin UI at /app
pnpm --filter @dtc/backend db:migrate
pnpm --filter @dtc/backend seed   # runs src/migration-scripts/initial-data-seed.ts
pnpm --filter @dtc/backend test:unit   # jest; integration:* scripts exist but
                                       # integration-tests/ dir is missing — they fail
```

No frontend tests exist. One-off ops scripts run via
`cd apps/backend && npx medusa exec ./<script>.ts`.

## Environment variables (names only — never commit values)

Backend (`apps/backend/.env.template`): `DATABASE_URL`, `DB_NAME`,
`JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`, `ADMIN_CORS`, `AUTH_CORS`,
`REDIS_URL` (in template only — no Redis module is wired).
Web: `NEXT_PUBLIC_MEDUSA_BACKEND_URL` (fallback `http://localhost:9000`),
`NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`. Only `src/services/medusa.ts` reads env.

⚠️ **Known security incident**: `apps/backend/get_key.js`, `test-db.js`,
`test-env.js`, and `.env.development/.production/.test` (both apps) are
git-tracked and contain real credentials. See BACKEND_PLAN.md "Critical".
Never add secrets to tracked files; extend `.env.template` with placeholders.

## Deployment targets (planned, not yet live)

- Frontend → **Vercel**: Root Directory = `apps/web`; set both `NEXT_PUBLIC_*`
  vars for Production + Preview. Backend `STORE_CORS` must include Vercel URLs.
- Backend → **GCP Cloud Run**: honors `PORT`, probe `GET /health`; run
  `medusa db:migrate` as a pre-deploy job, seed only as a one-off job (it is
  NOT idempotent — re-running duplicates the catalog).

## Do not touch

- Generated: `apps/web/.next/`, `apps/backend/.medusa/`, `.turbo/`, `node_modules/`
- `pnpm-lock.yaml` — modify only via pnpm commands
- `apps/backend/src/modules/homepage/migrations/*` — generated
  (`medusa db:generate homepage`); never hand-edit a committed migration
- `apps/backend/static/` — runtime upload storage, not source

## Conventions

- Conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`,
  optional scope — `feat(cart): add persistent guest cart`. Work lands on `main`.
- Components `PascalCase.tsx`; hooks `useX.ts`; utils camelCase; each web
  feature lives in `apps/web/src/features/<name>/` with a `components/` subdir.
- Module memory: web features carry a `MODULE.md` (protocol in
  `.agents/AGENTS.md`; new feature → copy `src/features/_template/`). Update it
  when you change a feature's architecture or exports.

## Cross-cutting rules

- Commerce/business logic lives in Medusa. Next.js renders and fetches only,
  through `apps/web/src/services/medusa.ts` — add new API helpers there, not
  inline `fetch` in components.
- Auth surface today: admin routes use Medusa session; `/store/*` needs the
  publishable-key header (SDK sends it); `GET /homepage` is deliberately
  public/keyless. There is no customer auth.
- Never guess Medusa response shapes — read `API_CONTRACTS.md`. Two recurring
  traps: `variant.options` is an **array** (not an object keyed by name), and
  store-API prices require `region_id`/`calculated_price` context.
- Current error-handling in web helpers (swallow → return `null`/`[]`) is a
  known flaw; when touching a helper, surface errors instead
  (FRONTEND_PLAN.md Module 1).

## Claude Code setup

- Recommended by the repo owner: install the Ponytail plugin for efficient
  coding — `/plugin install ponytail@ponytail`. If that marketplace isn't
  configured in your environment, skip it and continue; never block work on it.
