# Product studio (admin → "Product studio")

A card-grid editor for the client. Cards look like the storefront; clicking one
opens a replica of the product page where the photo, name, price, stock and
description are edited in place. A switch on every card and in the editor shows
or hides the product, always after a confirmation.

Code: `apps/backend/src/admin/routes/product-studio/page.tsx` (UI),
`apps/backend/src/api/admin/catalog-manager/` (API),
`apps/backend/src/lib/catalog-edit.ts` (validation + price merge).

## What it edits
Name, description, photos (first = cover/thumbnail), USD price, stock.
Other currencies (the catalog also carries INR) are left untouched. Status,
handle, categories etc. are **rejected** by the save route on purpose
(`ProductEditSchema` is `.strict()`); visibility has its own route which
requires `confirm: true`. Every write goes through Medusa's workflows so
`product.updated` fires and the storefront cache + search index refresh.

All 83 products have exactly one variant, so the editor treats the first
variant as "the" price/stock and warns if a product ever has more.

## "Hidden" means hidden — what enforces it
Hidden = Medusa product `status: "draft"`. One status, checked everywhere:

| Surface | How it is enforced |
|---|---|
| Shop, collections, categories, product page | Medusa's store API only returns `published` products |
| Search | `lib/product-search.ts` indexes `published` only; index is dropped on every product change |
| Storefront cache | `catalog-changed` subscriber purges the `products` tags on `product.updated`; catalog fetches also expire after 5 minutes as a backstop |
| Carts that already hold the product | `removeOrphanedCartItems` runs on every product update and removes items whose product isn't published |
| Checkout | `workflows/hooks/complete-cart-validate.ts` refuses to complete any cart containing an unpublished product |
| Reviews | `GET/POST /store/products/:id/reviews` answer 404 for hidden products |

Rule of thumb: if you add a new surface that lists or sells products, filter
on `isSellable()` from `lib/catalog-visibility.ts` or go through the store API.

## Operational notes
- Needs `STOREFRONT_URL` + `REVALIDATE_SECRET` on the backend for instant
  storefront refresh; without them changes appear within 5 minutes.
- Photo upload uses `/admin/uploads` (Cloudinary in production).
