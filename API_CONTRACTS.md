# API_CONTRACTS.md — every endpoint the storefront/admin uses

Verified against `apps/backend/src/api/**` and `apps/web/src/services/medusa.ts`
(2026-07-08). If you change any shape here, update backend route + `medusa.ts`
+ this file in the same commit.

## Custom endpoints (this repo's code)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/homepage` | **None** (public by design — bypasses publishable key; see note 1) | — | `{ homepage_settings: HomepageSetting \| null }` |
| GET | `/admin/homepage` | Admin session | — | `{ homepage_settings: HomepageSetting \| null }` |
| POST | `/admin/homepage` | Admin session | Any subset of the 7 writable `HomepageSetting` fields. Whitelisted (`id` cannot be injected); strings only; titles ≤300/subtitle ≤500 chars; URL fields ≤2000 chars, must be http(s) or root-relative. Invalid → 400 `{ message, errors[] }` | `{ homepage_settings: HomepageSetting }` (same **plural** key as GET, normalized 2026-07-08). On success the backend also POSTs `${STOREFRONT_URL}/api/revalidate` with header `x-revalidate-secret` |
| GET | `/admin/custom` | Admin session | — | empty 200 — dead starter stub, slated for deletion |
| GET | `/store/custom` | Publishable key | — | empty 200 — dead starter stub, slated for deletion |

### HomepageSetting shape

```ts
{
  id: string
  hero_title: string        // NOT NULL in DB; hero renders both real "\n" and literal "\n"
  hero_subtitle: string
  hero_image_url: string | null      // relative like /static/<file> or absolute
  promo_card_1_title: string | null
  promo_card_1_url: string | null    // image URL, despite the name
  promo_card_2_title: string | null
  promo_card_2_url: string | null
  // CMS sections added 2026-07-09 (all admin-managed, hidden when empty):
  announcement_text: string | null   // thin bar above the header
  footer_tagline: string | null
  hero_banners: Array<{ title?; subtitle?; image_url?; link? }> | null   // max 5; replaces single hero when present
  offer_cards: Array<{ title?; image_url?; link? }> | null              // max 8
  category_tiles: Array<{ name?; image_url?; link? }> | null            // max 12
  created_at: string; updated_at: string
}
```

List fields are validated server-side (array/type/length caps per item,
URL fields must be http(s) or relative); unknown item keys are stripped
and fully-empty items dropped. Consumer helper:
`apps/web/src/lib/data/homepage.ts` (`getHomepageSettings()`, 60s ISR +
on-demand revalidation via the catalog/homepage save hooks).

Frontend type in `medusa.ts` wrongly marks title/subtitle nullable — DB has
NOT NULL + defaults (FRONTEND_PLAN breaking-change #5).

## Built-in Medusa endpoints used

Called via `@medusajs/js-sdk` (`sdk.store.*`), which auto-sends
`x-publishable-api-key`. Consumers in `apps/web/src/services/medusa.ts`:

| Helper | SDK call | HTTP |
|---|---|---|
| `getBestSellers` | `store.collection.list({ handle: "homepage-best-sellers" })` then `store.product.list({ collection_id })` | GET `/store/collections`, GET `/store/products` |
| `getCategories` | `store.category.list({ fields: "*products" })` | GET `/store/product-categories` |
| `getProducts(categoryId?)` | `store.product.list({ category_id?, fields: "*variants,*variants.prices,*categories" })` | GET `/store/products` |
| `getProductByHandle` | `store.product.list({ handle, fields: "...,*options" })` | GET `/store/products` → `products[0]` |

Admin UI (`src/admin/routes/homepage/page.tsx`) additionally calls built-in
`POST /admin/uploads` (multipart) — files land on **local disk** `static/`
(no file module configured; ephemeral on Cloud Run).

## Response-shape traps (cost hours before — don't repeat)

1. **`/homepage` is intentionally top-level**, not `/store/homepage`, so the
   server component can raw-`fetch` it without a publishable key
   (`medusa.ts:29`). If you move it under `/store`, update that fetch to the
   SDK in the same deploy.
2. **`variant.options` is an ARRAY** of option-value objects in Medusa v2.
   `variants[0].options.Weight` (current code in Shop/PDP/BestSellers) always
   misses and falls back to `'1kg'`.
3. **Prices**: `*variants.prices` is not a store-API field; store API exposes
   `calculated_price` and needs `region_id`/`currency_code` context. Raw
   `variants[0].prices[0].amount` reads likely render 0/undefined.
4. ~~Envelope inconsistency~~ **Resolved 2026-07-08**: GET and POST both
   return `{ homepage_settings }`. GET/POST reads are ordered
   `created_at ASC` and POST self-heals duplicate rows, so the singleton is
   deterministic.

## Non-HTTP contract: admin live preview

Admin `page.tsx` → storefront hero iframe via
`postMessage({ type: 'UPDATE_PREVIEW', settings }, STOREFRONT_ORIGIN)`.
Both sides validate origin (2026-07-08): the admin targets
`STOREFRONT_URL` (injected at admin build via Vite define), and the
storefront's `hero/client.tsx` accepts messages only from the backend
origin (derived from `MEDUSA_BACKEND_URL`) plus localhost dev origins.

## Storefront cache revalidation

`POST {storefront}/api/revalidate` with header `x-revalidate-secret:
$REVALIDATE_SECRET` and body `{ path, type? }`. 401 without the secret;
503 if the storefront has no secret configured. Called server-side by the
backend after homepage saves — never from the browser.

## Seed-data dependencies (backend data the frontend hardcodes)

- Collection handle `homepage-best-sellers` (`medusa.ts:49`)
- Categories: Millets, Cold Pressed Oils, Spices
- Variant option `Weight` on all 3 seeded products
