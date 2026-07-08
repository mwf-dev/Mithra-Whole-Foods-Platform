# Module Context: Product (PDP)

## Description
Product detail page (`/products/[handle]`). `ProductDetails.tsx` is a client
component: image gallery, quantity stepper, add-to-cart button (no cart exists
— button is dead), related products via `ProductCard`.

## Components Exported
- `ProductDetails` (feature root) — used by `app/products/[handle]/page.tsx`,
  which fetches the product + related products (same first category, else all).

## State Management
Local `useState` for selected image and quantity only.

## Known gotchas (verified 2026-07)
- `page.tsx` destructures `params` synchronously — Next 15 makes it a
  Promise; needs `const { handle } = await params`.
- Unknown handle passes `null` product in (crashes) instead of `notFound()`.
- Same `options.Weight` (array!) and raw `prices[0].amount` accessor bugs as
  Shop/BestSellers (API_CONTRACTS.md traps 2–3).
- `app/products/[handle]/page.tsx` double-renders Header/Footer over
  GlobalShell.
- No `generateMetadata` — every PDP is titled "Mithra Whole Foods".

## When editing, also check
- `src/services/medusa.ts#getProductByHandle`, `/API_CONTRACTS.md`
- `Shop.tsx` / `BestSellers.tsx` for the shared accessor fixes.
