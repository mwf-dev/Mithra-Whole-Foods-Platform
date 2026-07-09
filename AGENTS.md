# AGENTS.md — Mithra Whole Foods

**All agent instructions live in [CLAUDE.md](CLAUDE.md)** (canonical: stack,
commands, env vars, deployment, conventions, do-not-touch zones). Read it
first, whatever tool you are (Cursor, Copilot, Codex, Claude Code, …).

Then, depending on where you're working:

- `apps/web/CLAUDE.md` / `apps/backend/CLAUDE.md` — per-app context & gotchas
- `API_CONTRACTS.md` — endpoint shapes; never guess Medusa responses
- `CODEBASE_MAP.md` — module index + data flow
- `.agents/AGENTS.md` — the per-feature MODULE.md memory protocol
- `BACKEND_PLAN.md` / `FRONTEND_PLAN.md` — known bugs & prioritized fix order

## Non-negotiable working rules (repo-specific)

1. Commerce logic goes in Medusa (`apps/backend`); the storefront only
   renders and calls `apps/web/src/services/medusa.ts` helpers.
2. Any endpoint or response-shape change updates backend route, `medusa.ts`,
   and `API_CONTRACTS.md` in the same commit.
3. Never re-run the seed on a non-empty DB (it duplicates the catalog).
4. Never commit secrets — a leak cleanup is already pending
   (BACKEND_PLAN.md "Critical"); don't make it worse.
5. Conventional commits (`feat:`, `fix:`, …). A task is done only when it
   builds (`pnpm build`), lints, and the touched feature's MODULE.md still
   tells the truth.
