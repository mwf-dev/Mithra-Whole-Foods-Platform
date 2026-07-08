# API_CONTRACTS.md — every endpoint the storefront/admin uses

Verified against `apps/backend/src/api/**` and `apps/web/src/services/medusa.ts`
(2026-07-08). If you change any shape here, update backend route + `medusa.ts`
+ this file in the same commit.

## Custom endpoints (this repo's code)

| Method | Path | Auth | Request | Response |
|---|---|---|---|---|
| GET | `/homepage` | **None** (public by design — bypasses publishable key; see note 1) | — | `{ homepage_settings: HomepageSetting \| null }` |
| GET | `/admin/homepage` | Admin session | — | `{ homepage_settings: HomepageSetting \| null }` |
| POST | `/admin/homepage` | Admin session | Any subset of the 8 writable `HomepageSetting` fields. ⚠️ Currently **unvalidated** — body is spread raw; a body `id` redirects the upsert | `{ homepage_setting: HomepageSetting }` ⚠️ **singular** key — differs from GET's plural |
| GET | `/admin/custom` | Admin session | — | empty 200 — dead starter stub, slated for deletion |
| GET | `/store/custom` | Publishable key | — | empty 200 — dead starter stub, slated for deletion |

### HomepageSetting shape

```ts
{
  id: string
  hero_title: string        // NOT NULL in DB; default contains literal "\n" —
  hero_subtitle: string     //   Hero.tsx splits title on the two chars '\','n'
  hero_image_url: string | null      // relative like /static/<file> or absolute
  promo_card_1_title: string | null
  promo_card_1_url: string | null    // image URL, despite the name
  promo_card_2_title: string | null
  promo_card_2_url: string | null
  created_at: string; updated_at: string
}
```

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
4. **Envelope inconsistency**: GET returns `homepage_settings`, POST returns
   `homepage_setting`. Normalizing it breaks `medusa.ts:39` and admin
   `page.tsx` — one commit, all three places.

## Non-HTTP contract: admin live preview

Admin `page.tsx` → storefront `Home.tsx` iframe via
`postMessage({ type: 'UPDATE_PREVIEW', settings: HomepageSetting }, '*')`.
⚠️ No origin checks on either side yet (see FRONTEND_PLAN breaking-change #2);
fix must land on both sides atomically.

## Seed-data dependencies (backend data the frontend hardcodes)

- Collection handle `homepage-best-sellers` (`medusa.ts:49`)
- Categories: Millets, Cold Pressed Oils, Spices
- Variant option `Weight` on all 3 seeded products
