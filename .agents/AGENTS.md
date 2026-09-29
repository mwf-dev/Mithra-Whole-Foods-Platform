# Module Memory Protocol

Global instructions: [/CLAUDE.md](../CLAUDE.md) (canonical) and
[/AGENTS.md](../AGENTS.md). This file defines only the **per-feature memory
system** for `apps/web/src/features/*`.

## Before editing a feature

Read that feature's `MODULE.md` (all four features have one: home, layout,
shop, product). It is the source of truth for the feature's boundaries,
exports, and known gotchas — cheaper than re-deriving them from code.

## Creating a new feature

Copy `apps/web/src/features/_template/` to `features/<name>/`, fill in
`MODULE.md` **before** writing code. Add the feature to `/CODEBASE_MAP.md`.

## After completing a task

- Update the feature's `MODULE.md` if exports, architecture, or data flow
  changed — a MODULE.md that lies is worse than none.
- `LESSONS.md` / `TODO.md` exist in `_template/` but are optional: create or
  update them only when you have real content (a non-obvious bug cause, a
  deliberate deferral). Do not commit untouched placeholder copies.
- If you changed any endpoint usage, update `/API_CONTRACTS.md`.

## Scope note

The backend has no MODULE.md system; `apps/backend/CLAUDE.md` covers it.
Backend `src/*/README.md` files are Medusa starter docs, not project memory.
