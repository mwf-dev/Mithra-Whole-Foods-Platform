I've audited the repo directly, starting with the overall structure, git-tracked secrets, and deployment configs.

Templates only are tracked now — but I need to check history for the known credential incident, plus the current env-file state on disk.

One last round of checks on the frontend build-time behavior.

Audit complete. Everything below was verified directly against the code; I've flagged what can't be.

---

## 1. Overall verdict: **Not ready — blockers present**

The codebase is in far better shape than its own docs claim (config hardening, fail-fast env checks, CORS from env, validated admin writes all landed), but three things block a production deploy today: **real credentials are recoverable from git history** and rotation can't be confirmed from code; **the declared image stack (Cloudinary) does not exist anywhere in the code** — uploads go to local disk, which is ephemeral on Koyeb, so every uploaded image will vanish on redeploy; and the storefront runs **Next.js 15.3.9, which carries 7 high-severity CVEs** (middleware bypass, SSRF, DoS) patched in ≥15.5.18. There's also a 51-file uncommitted working tree, so what's in git isn't even what you'd be deploying.

## 2. Area-by-area

| # | Area | Status | Evidence |
|---|------|--------|----------|
| 1 | Secrets | ⚠️ | Only `.env.template`s tracked now; fail-fast guards in [medusa-config.ts:10-20](apps/backend/medusa-config.ts:10). But real `DATABASE_URL`/`JWT_SECRET`/`COOKIE_SECRET` live in git history (`.env.production` et al., removed in `e8251b4` but recoverable). Rotation: unverifiable from code — confirm manually. |
| 2 | Backend/Koyeb | ✅ | [Dockerfile](apps/backend/Dockerfile) is a clean multi-stage build (Cloud-Run-targeted but nothing GCP-specific — works on Koyeb). Medusa CLI defaults port to `process.env.PORT` (`@medusajs/cli/dist/create-cli.js:422`), `listen(port, host)` with host undefined = all interfaces, `GET /health` and SIGTERM graceful shutdown built into `medusa start`. `NODE_ENV=production` baked in. |
| 3 | Database | ✅ | Neon with `ssl: { rejectUnauthorized: true }` ([medusa-config.ts:89](apps/backend/medusa-config.ts:89)); migrations committed ([src/modules/homepage/migrations/](apps/backend/src/modules/homepage/migrations)); template mandates the pooled connection string. Backups = Neon PITR — unverifiable from code. |
| 4 | Cloudinary | 🚫 | **Zero Cloudinary code exists** — the only mentions are in the aspirational spec docs. File storage is local `static/` (ephemeral on Koyeb) or an optional S3-compatible module ([medusa-config.ts:31-51](apps/backend/medusa-config.ts:31)). No upload type/size limits configured anywhere. |
| 5 | Frontend/Vercel | ⚠️ | Backend URL from `MEDUSA_BACKEND_URL` env with localhost dev fallback ([config.ts:5-9](apps/web/src/lib/config.ts:5)); `NEXT_PUBLIC_*` vars are all genuinely public (publishable/Stripe keys, URLs). But [next.config.js:22-53](apps/web/next.config.js:22) `remotePatterns` omits your production image host — `next/image` will reject prod product images. Preview/Prod env split: dashboard-only, confirm manually. |
| 6 | API/CORS | ✅ | All three CORS values come from env with **fatal error if unset in prod** ([medusa-config.ts:17-19](apps/backend/medusa-config.ts:17)) — no `*`, no insecure default. Actual values must include Vercel domains: manual check. |
| 7 | Security | ⚠️ | Admin homepage POST has whitelist validation with tests ([validation.ts](apps/backend/src/api/admin/homepage/validation.ts)); revalidate endpoint is shared-secret-gated and fails closed ([revalidate/route.ts:11-20](apps/web/src/app/api/revalidate/route.ts:11)). But **no rate limiting anywhere** (no `middlewares.ts`), and `pnpm audit --prod`: **30 vulns (9 high)** — Next.js 15.3.9 (needs ≥15.5.18) and lodash ≤4.17.23. |
| 8 | Errors/logging | ⚠️ | Route handlers try/catch and degrade gracefully ([admin/homepage/route.ts:64-67](apps/backend/src/api/admin/homepage/route.ts:64), [revalidate-storefront.ts](apps/backend/src/utils/revalidate-storefront.ts)); no secrets in logs found. **No error tracking** — no Sentry dep in either package.json, [instrumentation.ts](apps/backend/instrumentation.ts) is fully commented out. |
| 9 | Performance | ⚠️ | Store listings paginated (limit 12/offset, [products.ts:29-31](apps/web/src/lib/data/products.ts:29)); homepage cached 60s + on-demand revalidation ([homepage.ts](apps/web/src/lib/data/homepage.ts)). Cache/event-bus are in-memory unless `REDIS_URL` set — **single instance only** until Redis. Images have no CDN story (ties to #4). |
| 10 | CI/CD | 🚫 | No `.github/` directory, no CI config of any kind. Nothing runs lint/tests before deploy. Rollback = platform features only (Vercel redeploy / Koyeb previous image) — nothing repo-side. |
| 11 | Testing | 🚫 | Exactly **one** automated test file in the repo ([validation.unit.spec.ts](apps/backend/src/api/admin/homepage/__tests__/validation.unit.spec.ts)); `integration-tests/` holds only a `setup.js`; zero frontend tests. QA so far is manual (QA_TEST_REPORT.md). |

## 3. Must-fix before deploy (blockers)

1. **Rotate the leaked credentials** — Neon `DATABASE_URL`, `JWT_SECRET`, `COOKIE_SECRET` from the pre-`e8251b4` history are recoverable by anyone with repo access. [DEPLOYMENT.md](DEPLOYMENT.md) itself lists this as step 0; do it and consider a history scrub (`git filter-repo`) if the repo ever goes public.
2. **Wire real image storage.** Cloudinary is in your stated stack but absent from the code. Either add a Cloudinary file provider for Medusa, or use the already-built S3-compatible path (`S3_*` vars → works with Cloudflare R2/GCS/S3). Without it, every admin upload dies on the next Koyeb redeploy. Then add that host to `remotePatterns` in [next.config.js](apps/web/next.config.js) or prod images 500.
3. **Upgrade Next.js to ≥15.5.18** — current 15.3.9 has high-severity middleware-bypass, SSRF, and DoS advisories (confirmed via `pnpm audit --prod`).
4. **Commit the working tree.** 51 modified/untracked files right now, including one-off scripts ([fix-products.ts](apps/backend/src/scripts/fix-products.ts), [rename-files.js](apps/backend/rename-files.js)) and deleted static assets — git ≠ what you'd deploy.
5. **Payments** — no payment module is registered in [medusa-config.ts](apps/backend/medusa-config.ts) (Stripe libs exist only in the web package). If launch means taking money, this is a blocker; if it's a browse-only soft launch, it isn't.

## 4. Should-fix soon

- **Harden .gitignore**: the exact files that leaked (`.env.development`, `.env.production` — no `.local` suffix) are *still not ignored* by any `.gitignore`. Add `.env.*` + `!.env.template`.
- **Rate limiting** on public endpoints (`/homepage`, `/store/*`) — none exists; add middleware or front Koyeb with Cloudflare.
- **Error tracking** (Sentry or similar) on both apps — currently a prod incident is invisible unless someone reads Koyeb logs.
- **Minimal CI** (GitHub Actions: lint + `test:unit` + `next build` on PR) — nothing gates a broken deploy today.
- **Migration step on Koyeb**: the Dockerfile assumes a separate migration job (`npx medusa db:migrate`). Koyeb has no pre-deploy job primitive — script this into your deploy process explicitly.
- **Keep Koyeb at 1 instance** until `REDIS_URL` is set (in-memory event bus/cache are per-instance — [medusa-config.ts:53-71](apps/backend/medusa-config.ts:53)).
- Upgrade lodash (high advisory, web prod dep).

## 5. Nice-to-have

- Structured JSON logging; drop `logging.fetches.fullUrl` in [next.config.js:16-20](apps/web/next.config.js:16) for prod.
- Enable the OpenTelemetry hook ([instrumentation.ts](apps/backend/instrumentation.ts)).
- Real test coverage beyond the single validation spec.
- Prune the stale root/backend CLAUDE.md claims (they describe already-fixed flaws — I verified `rejectUnauthorized: true`, fail-fast secrets, and body validation are all in place, contradicting the docs).

## 6. Manual checks outside the repo

- **Koyeb**: env vars set (`DATABASE_URL` pooled, `JWT_SECRET`, `COOKIE_SECRET`, 3× CORS, `STOREFRONT_URL`, `REVALIDATE_SECRET`, `S3_*`/Cloudinary once wired); health-check path set to `/health`; instance count = 1; rollback procedure tested.
- **Vercel**: `MEDUSA_BACKEND_URL` (server-side — note it's *not* `NEXT_PUBLIC_` anymore, the middleware error at [middleware.ts:18](apps/web/src/middleware.ts:18) says so explicitly), `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_DEFAULT_REGION=in`, `REVALIDATE_SECRET` — set for **both** Production and Preview. Also: the build runs `generateStaticParams` against the backend (product/category/collection pages), so **the Koyeb backend must be live and seeded before the first Vercel build**.
- **CORS values**: `STORE_CORS`/`AUTH_CORS` must include the real Vercel prod domain *and* preview URLs.
- **Neon**: confirm credential rotation actually happened; confirm PITR/backup retention; use the pooled connection string.
- **Secrets parity**: `REVALIDATE_SECRET` identical on Koyeb and Vercel, or admin saves won't refresh the storefront (fails silently by design — [revalidate-storefront.ts](apps/backend/src/utils/revalidate-storefront.ts)).
- I did **not** run `next build` in this audit — run `pnpm build` once with prod-like env before the first deploy.