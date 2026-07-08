# apps/web — Next.js 15 storefront

Server-rendered storefront for Mithra Whole Foods: homepage (CMS-driven hero +
live catalog sections), `/shop` listing with category filter, `/products/[handle]`
PDP. Root rules in [/CLAUDE.md](../../CLAUDE.md); endpoints in [/API_CONTRACTS.md](../../API_CONTRACTS.md).

## Load-bearing files

- `src/services/medusa.ts` — the ONLY data-access layer and the only file
  reading `process.env`. All backend calls go through its exported helpers.
- `src/app/layout.tsx` — fonts (Inter body, Playfair headings) + `GlobalShell`
  (TopBanner/Header/CategoryNav/Footer) around every route.
- `src/features/home/Home.tsx` — client wrapper; holds settings state and the
  admin-preview `postMessage` listener.
- `src/features/home/components/ProductCard.tsx` — de-facto shared product
  card (also imported by shop + product features; belongs in
  `components/shared/` eventually).
- `src/app/globals.css` — Tailwind v4 theme: brand tokens
  (`--color-primary-green: #2E7D32`, cream `#FAF8F3`, earth-brown `#8D6E63`,
  radius 12px). No tailwind.config file — edit theme here.

## Local conventions

- Features under `src/features/<name>/` (entry component at feature root,
  pieces in `components/`). New feature: copy `src/features/_template/`, fill
  its MODULE.md (protocol in `/.agents/AGENTS.md`).
- Server components by default; add `"use client"` only for state/effects
  (currently only `Home.tsx`, `Shop.tsx`, `ProductDetails.tsx`).
- Icons: lucide-react. Styling: Tailwind utilities only. Currency is INR
  (seed region), though UI still hardcodes `$` in places.
- zustand / react-query / react-hook-form / zod / framer-motion / embla are
  installed but **unused** — don't mimic patterns that aren't there; adopting
  one is a deliberate choice, note it in the feature's MODULE.md.

## Gotchas (verified 2026-07, cost real debugging time)

- `/shop` and `/products/[handle]` pages render `<Header/>`/`<Footer/>` even
  though `GlobalShell` already does → double header/footer. Don't copy that
  pattern into new pages; fix is to remove them from the pages.
- Next 15: route `params` is a **Promise** — `const { handle } = await params`.
  `products/[handle]/page.tsx` still destructures synchronously (known bug).
- `variant.options` is an array; `options.Weight` object access always falls
  back to `'1kg'`. Prices need `calculated_price` + region context
  (API_CONTRACTS.md traps 2–3).
- `{ next: { revalidate: 0 } }` passed to SDK helpers is the **headers** arg —
  a no-op, not caching config.
- `Hero.tsx` splits `hero_title` on the literal two-char `'\n'` sequence to
  match the DB default. `MostLovedProducts.tsx` is orphaned (not rendered).
- No `loading.tsx` / `error.tsx` / `not-found.tsx` anywhere; unknown product
  handle currently passes `null` into `ProductDetails` instead of 404.
- Images are CSS `background-image` divs, not `next/image`; `next.config.ts`
  is empty (no `remotePatterns`) — adding `next/image` with remote URLs will
  fail until patterns are configured.

## Common tasks

- **New backend data on a page** → add a typed helper in `medusa.ts` (check
  API_CONTRACTS.md first), call it from the server component, pass props down.
- **New page** → `src/app/<route>/page.tsx`; do NOT add Header/Footer (shell
  provides them).
- **Theme/style change** → `globals.css` tokens, not per-component hex values.

## When editing here, also check/update

- `/API_CONTRACTS.md` if you touch `medusa.ts` or any endpoint usage
- The feature's `MODULE.md` if exports/architecture change
- Admin `apps/backend/src/admin/routes/homepage/page.tsx` + `Home.tsx`
  together for anything touching the preview postMessage contract
- `FRONTEND_PLAN.md` — mark fixed items so the roadmap stays truthful
