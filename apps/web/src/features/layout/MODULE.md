# Module Context: Layout (Global Shell)

## Description
Persistent chrome for every route: `GlobalShell` composes TopBanner + Header +
CategoryNav + `{children}` + Footer. Mounted once in `app/layout.tsx`.

## Components Exported
- `GlobalShell` (feature root) — the only export consumed outside;
  `components/`: `TopBanner`, `Header`, `CategoryNav`, `Footer`.

## State Management
None — all four are server components with zero interactivity today.
There is NO mobile menu yet: header nav hides below `lg`, CategoryNav below
`md`, so phones get no navigation. Adding the hamburger will need a small
`"use client"` leaf component.

## Dependencies
- Next `Link`, `lucide-react` icons, Tailwind tokens from `globals.css`.
- Does NOT use shadcn `components/ui/button.tsx` (an older note claimed it
  would — still true that nothing imports it).

## Known state (verified 2026-07)
- Most links are dead: CategoryNav's 7 `/category/*` routes, TopBanner's
  `/about` `/farms` `/contact`, ~20 Footer `href="#"` — none of these routes
  exist. Planned fix: point category links at `/shop?category=<handle>` and
  render CategoryNav from `getCategories()`.
- CategoryNav categories are hardcoded and DON'T match the 3 seeded ones
  (Millets, Cold Pressed Oils, Spices).
- Header search inputs submit nowhere; Login/Wishlist buttons no-op; cart
  badge is a hardcoded "3" (there is no cart feature).

## Architecture Rules
- Keep server-component-first; interactivity only in leaf client components.
- `/shop` and PDP pages currently double-render Header/Footer on top of
  GlobalShell — never add Header/Footer to a page; the shell owns them.
