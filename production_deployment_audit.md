I'll audit the repo directly — starting with structure, git-tracked secrets, and deploy configs.

Backend config looks hardened. Now checking git history for leaked secrets, the web app's env handling, and upload/security surface.

The `===` separators broke in zsh; re-running with quotes.

Now scanning for leaked secrets in tracked files, checking Medusa's health/SIGTERM handling, the Cloudinary plugin, and kicking off a production build to verify it passes.

The web package isn't named "web" — checking its actual name and rerunning the build.

Build passed (exit 0, full SSG). One last check on auth cookie flags, then I'll compile the report.

All checks are done. Let me update the existing memory file with the audit outcome, then write up the report.

# Production-Deploy Readiness Audit — Koyeb + Cloudinary + Vercel

## 1. Overall verdict: **Ready with caveats**

The code itself is deploy-shaped and I verified the critical mechanics directly: the backend fails fast on missing secrets/CORS in production ([medusa-config.ts:10-20](apps/backend/medusa-config.ts:10)), the Dockerfile is a clean two-stage build that honors `PORT` and works on Koyeb despite saying "Cloud Run", Medusa ships a built-in `GET /health` and SIGTERM graceful shutdown (confirmed in `@medusajs/medusa/dist/commands/start.js:245-268`), Cloudinary is wired server-side with signed uploads, the web production build **passes** (I ran it — full SSG, 460+ product pages), and the one backend test suite passes. What keeps this from a clean "Ready": **leaked credentials remain in git history and rotation can't be verified from code**, Cloudinary config silently falls back to ephemeral local disk if env vars are missing, there is zero rate limiting, no CI, and no error tracking. None of these require code rewrites, but the credential rotation is a hard gate.

## 2. Area-by-area

| # | Area | Status | Evidence |
|---|---|---|---|
| 1 | Secrets | ⚠️ | No secrets in tracked files now (`git grep` clean; [PRODUCTION_AUDIT.md:17](PRODUCTION_AUDIT.md) is redacted); `.gitignore` blocks `.env*` except templates — but real Neon/JWT values were committed in `31d258a`/`e35c5f6` and **remain in git history** (deleted in `e8251b4`, never rewritten). Fail-fast on missing env is solid ([medusa-config.ts:10-20](apps/backend/medusa-config.ts:10)). `.env.template` omits `CLOUDINARY_*` despite the code using them. |
| 2 | Backend/Koyeb | ✅ | [Dockerfile](apps/backend/Dockerfile) builds from repo root, prod-only deps; `PORT` env honored (`@medusajs/cli/dist/create-cli.js:422`), host arg undefined → Node binds all interfaces; `GET /health` + `GracefulShutdownServer` with SIGTERM/SIGINT handlers verified in Medusa's `start.js`; `NODE_ENV≠development` treated as prod, no debug fallbacks ([medusa-config.ts:8](apps/backend/medusa-config.ts:8)). |
| 3 | Database | ⚠️ | TLS enforced (`ssl.rejectUnauthorized: true`, [medusa-config.ts:108](apps/backend/medusa-config.ts:108)); migrations generated + committed (`src/modules/homepage/migrations/`); [.env.template](apps/backend/.env.template) instructs Neon **pooled** string — whether prod actually uses it is unverifiable from code. Backups = Neon-side, unverifiable. |
| 4 | Cloudinary | ⚠️ | Credentials backend-env only ([medusa-config.ts:51-70](apps/backend/medusa-config.ts:51)); plugin does **signed server-side** uploads (no unsigned presets; verified in the plugin's `file-cloudinary/service.js`), errors rejected properly. But: no file type/size validation (`resource_type: "auto"`, admin-auth is the only gate), and if `CLOUDINARY_CLOUD_NAME` is unset the config **silently** falls back to local disk — ephemeral on Koyeb, images lost. |
| 5 | Frontend/Vercel | ✅ | Backend URL from `MEDUSA_BACKEND_URL` (server-side, not `NEXT_PUBLIC_`) with localhost only as dev fallback ([config.ts:5-9](apps/web/src/lib/config.ts:5)); `NEXT_PUBLIC_*` vars carry only the publishable key, base URL, region — no secrets; `REVALIDATE_SECRET` correctly non-public. Prod build verified passing. Preview/Prod env split is a dashboard setting — unverifiable. |
| 6 | API/CORS | ✅ | CORS strictly from env, boot **fails** if unset in prod ([medusa-config.ts:17-19](apps/backend/medusa-config.ts:17)) — no `*` anywhere in code; actual origin values are a Koyeb dashboard check. Contract consistent: web SDK sends the publishable key, `/api/revalidate` secret matches backend's [revalidate-storefront.ts](apps/backend/src/utils/revalidate-storefront.ts). |
| 7 | Security | ⚠️ | Admin homepage POST has real whitelist/length/URL validation ([validation.ts](apps/backend/src/api/admin/homepage/validation.ts)) with passing unit tests; auth cookies are `httpOnly`+`sameSite:strict`+`secure` in prod ([cookies.ts:52-59](apps/web/src/lib/data/cookies.ts:52)); revalidate endpoint secret-gated ([route.ts](apps/web/src/app/api/revalidate/route.ts)). But **zero rate limiting** (no `middlewares.ts`, no limiter anywhere — grep clean), and `pnpm audit --prod`: **2 high** (lodash `_.template` via backend transitives; vite — build-time only) + 9 moderate. |
| 8 | Errors/logging | ⚠️ | Routes catch and return sanitized 500s without leaking internals ([admin/homepage/route.ts:63-66](apps/backend/src/api/admin/homepage/route.ts:63)); web has `error.tsx` boundaries. But no Sentry/error tracking anywhere (grep clean; [instrumentation.ts](apps/backend/instrumentation.ts) is fully commented out), and logging is unstructured `console.*`. |
| 9 | Performance | ✅ | Cloudinary images served via `res.cloudinary.com` through Next image optimization ([next.config.js:24-27](apps/web/next.config.js:24)), not proxied through the backend; product/category pages are SSG with event-driven revalidation ([subscribers/catalog-changed.ts](apps/backend/src/subscribers/catalog-changed.ts)); middleware caches the region map 1h. Store APIs are Medusa built-ins (paginated by default). I did not do a deep N+1 audit of custom queries — the only custom endpoint returns a single row. |
| 10 | CI/CD | 🚫 | **No CI exists.** No `.github/workflows/` (only the starter's issue template). Nothing runs lint/tests before deploy. Rollback: Vercel has built-in instant rollback and Koyeb keeps prior deployments, but both are platform features, not repo config. |
| 11 | Testing | ⚠️ | Honest count: **1 backend unit suite, 8 tests** (homepage validation — I ran it, passes). Zero frontend tests. `test:integration:*` scripts point at an `integration-tests/` dir containing only `setup.js` — they test nothing. E2E was done manually per project history, not automated. |

## 3. Must-fix before deploy

1. **Rotate the Neon `DATABASE_URL` credential and the JWT/COOKIE secrets.** Real values are permanently in git history (`.env.production` added in `31d258a`, `get_key.js` in `e35c5f6`; deleted but not rewritten). If the repo is/was on GitHub, treat them as compromised. *Unverifiable from code whether this happened — confirm manually.*
2. **Set `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` on Koyeb — and consider making their absence fatal.** [medusa-config.ts:51](apps/backend/medusa-config.ts:51) silently falls back to local-disk uploads when unset; on Koyeb that means every uploaded image disappears on redeploy with no error. A 3-line guard next to the existing JWT check would close this trap. Also add the `CLOUDINARY_*` block to [.env.template](apps/backend/.env.template) (currently only documents `S3_*`).
3. **Pin Koyeb to a single backend instance until Redis is wired.** Cache, event bus, and workflow engine are in-memory unless `REDIS_URL` is set ([medusa-config.ts:75-90](apps/backend/medusa-config.ts:75)) — two instances would have divergent state and broken event subscribers (including cache revalidation).
4. **Re-upload catalog images after Cloudinary is live.** Per project history, hero/product image URLs stored in the DB still point at `http://localhost:9000` — they will 404 in production regardless of everything else being correct.

## 4. Should-fix soon

- **Rate limiting** — nothing protects `/auth/*` (admin login brute force), `/store/*`, or the public `GET /homepage`. Options: Koyeb's edge, or a Medusa `src/api/middlewares.ts` with a limiter.
- **Error tracking** — wire Sentry (or similar) in both apps; today a production incident is invisible unless someone reads Koyeb/Vercel raw logs.
- **Minimal CI** — a single GitHub Actions workflow running `pnpm lint`, `test:unit`, and both builds on PR would gate deploys at near-zero cost.
- **Dependency vulns** — the 2 highs are transitive (lodash under Medusa's deps, vite in the admin build toolchain), so exploitability is low, but track them; a `pnpm.overrides` bump for lodash ≥4.18 is cheap.
- **Update [DEPLOYMENT.md](DEPLOYMENT.md) for Koyeb** — it's a good runbook but says GCP Cloud Run + GCS/S3 throughout; the S3 sections are now superseded by Cloudinary.
- **Add `MEDUSA_BACKEND_URL` to [check-env-variables.js](apps/web/check-env-variables.js)** — it only enforces the publishable key; a missing backend URL currently surfaces as a runtime middleware crash instead of a build-time failure ([middleware.ts:16-19](apps/web/src/middleware.ts:16)).
- **Note the build-order constraint**: the Vercel build SSGs product pages against the live backend (my build generated 461 product paths), so the backend must be deployed and reachable *before* the first Vercel build — and a backend outage will fail Vercel builds.

## 5. Nice-to-have

- [next-sitemap.js](apps/web/next-sitemap.js) is dead config: no `postbuild` script invokes it, and its `siteUrl` reads `NEXT_PUBLIC_VERCEL_URL`, which Vercel doesn't set automatically.
- Trim dev remnants from [next.config.js](apps/web/next.config.js): the `http://localhost` and `medusa-server-testing.s3.*` image patterns.
- `apps/web/package.json` `resolutions`/`overrides` fields are ignored by pnpm (it warns on every install); the effective pin is the root `pnpm.overrides` — delete the dead fields.
- The build pre-generates `dk/fr/de` region paths — leftover starter regions in the DB worth deleting for an India-first store.
- Enable the OpenTelemetry instrumentation stub ([instrumentation.ts](apps/backend/instrumentation.ts)) once there's somewhere to send traces.

## 6. Manual checks outside the repo

**Koyeb:** all fail-fast env vars set (`DATABASE_URL` — pooled Neon string, `JWT_SECRET`, `COOKIE_SECRET`, `STORE_CORS`/`ADMIN_CORS`/`AUTH_CORS`, `STOREFRONT_URL`, `REVALIDATE_SECRET`, `CLOUDINARY_*`, `NODE_ENV=production`); health check pointed at `GET /health`; instance count = 1; confirm the Docker build passes `--build-arg STOREFRONT_URL=<vercel-domain>` (it's baked into the admin bundle); locate the "redeploy previous deployment" rollback flow before you need it.
**Vercel:** `MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_DEFAULT_REGION=in`, `REVALIDATE_SECRET` set for **both** Production and Preview; Root Directory = `apps/web`.
**Cross-check:** `STORE_CORS`/`AUTH_CORS` on Koyeb include the exact Vercel production domain (and preview wildcard if you want previews to work); `REVALIDATE_SECRET` identical on both sides.
**Cloudinary:** confirm **no unsigned upload presets** exist (the code never needs one — all uploads are signed server-side); optionally set an upload size cap at the account level since the code doesn't enforce one.
**Neon:** credential rotation actually done; PITR/backup retention configured; production URL uses the *pooled* endpoint.
**GitHub:** if the repo is public or was ever public, assume the historical credentials were scraped — rotation is non-negotiable.

One honest limitation: this audit verified everything checkable from the repo (including running the build, unit tests, and a production dependency audit), but roughly a third of readiness for this stack lives in dashboard state — section 6 is the real pre-launch checklist.