# Module Context: Shop

## Description
Product listing page (`/shop`). `Shop.tsx` is a client component receiving
server-fetched `products` + `categories` from `app/shop/page.tsx` and
filtering client-side by category (`useState`/`useMemo`) — no URL params, no
pagination, no refetch on filter.

## Components Exported
- `Shop` (feature root) — renders category filter pills + a grid of
  `ProductCard` (imported from `features/home/components/ProductCard`).

## State Management
Local `useState` for selected category. Filter state is NOT reflected in the
URL — `/shop?category=` links from layout/home won't work until that's added.

## Known gotchas (verified 2026-07)
- Reads `variants[0].options.Weight` — `options` is an ARRAY in Medusa v2, so
  this always falls back to `'1kg'` (API_CONTRACTS.md trap 2).
- Reads `variants[0].prices[0].amount` — store API needs `calculated_price` +
  region context (trap 3).
- `app/shop/page.tsx` double-renders Header/Footer over GlobalShell.

## When editing, also check
- `src/services/medusa.ts#getProducts`, `/API_CONTRACTS.md`
- `ProductDetails.tsx` and `BestSellers.tsx` share the same option/price
  accessor bugs — fix all three together.
