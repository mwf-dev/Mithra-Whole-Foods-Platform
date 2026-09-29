import { Metadata } from "next"

import { getWishlist } from "@lib/data/wishlist"
import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import ProductPreview from "@modules/products/components/product-preview"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Heart } from "lucide-react"

export const metadata: Metadata = {
  title: "Wish List",
  description: "Products you've saved.",
}

export default async function WishlistPage(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  const [handles, region] = await Promise.all([
    getWishlist(),
    getRegion(countryCode),
  ])

  const saved = new Set(handles)
  let products: any[] = []

  if (saved.size > 0 && region) {
    const {
      response: { products: all },
    } = await listProducts({ countryCode, queryParams: { limit: 100 } })
    // Preserve the order the shopper saved them in.
    const byHandle = new Map(all.map((p) => [p.handle, p]))
    products = handles.map((h) => byHandle.get(h)).filter(Boolean)
  }

  return (
    <div className="w-full" data-testid="wishlist-page-wrapper">
      <div className="mb-8 flex flex-col gap-y-4">
        <h1 className="text-2xl-semi">Wish List</h1>
        <p className="text-base-regular">Products you’ve saved for later.</p>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
          <div className="rounded-full bg-[#F3F7F4] p-5 text-[#2E5C31]">
            <Heart size={28} strokeWidth={1.5} />
          </div>
          <p className="text-ui-fg-subtle max-w-sm">
            Your wish list is empty. Tap the heart on any product to save it here.
          </p>
          <LocalizedClientLink
            href="/store"
            className="mt-1 inline-flex items-center rounded-full bg-[#2E5C31] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#244a27] transition-colors"
          >
            Browse products
          </LocalizedClientLink>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-8 small:grid-cols-3">
          {products.map((p) => (
            <li key={p.id}>
              <ProductPreview product={p} region={region!} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
