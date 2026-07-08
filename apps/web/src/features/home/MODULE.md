# Module Context: Home

## Description
Landing page (`/`). `Home.tsx` is a client wrapper that receives
server-fetched props from `app/page.tsx` and holds them in state so the admin
live preview can override them via `postMessage` (`{ type: 'UPDATE_PREVIEW',
settings }` — no origin check yet, see FRONTEND_PLAN breaking-change #2).

## Components Exported
- `Home` (feature root): assembles, in order — Hero, ShopByCategory,
  BestSellers, Collections, WhyChooseUs, TrustStrip, Newsletter.

## Component inventory (`components/`)
- CMS-driven (HomepageSettings props): `Hero` (splits `hero_title` on literal
  `'\n'` two-char sequence), `Collections` (promo cards).
- Live data: `BestSellers` (best-seller products; falls back to a dummy card
  when API empty — known flaw), `ShopByCategory` (categories; ignores real
  category images).
- Static: `WhyChooseUs`, `TrustStrip`, `Newsletter` (form has no handler).
- `ProductCard` — shared across shop + product features despite living here.
- `MostLovedProducts` — ORPHANED, not rendered by `Home`; delete or wire up.

## State Management
Plain `useState` + `useEffect` (postMessage listener) in `Home.tsx` only.
No zustand/react-query — don't introduce without noting it here.

## Architecture Rules
- Data comes in as props from `app/page.tsx` server component — no fetching
  inside this feature.
- Images are currently CSS `background-image` (no alt text, no `next/image`);
  migration to `next/image` requires `remotePatterns` in `next.config.ts` first.
- Apple-inspired aesthetic: whitespace, Playfair headings, brand tokens from
  `globals.css` — no hardcoded hex.
