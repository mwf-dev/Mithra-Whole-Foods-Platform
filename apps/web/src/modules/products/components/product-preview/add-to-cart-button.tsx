"use client"

import { useCart } from "@lib/context/cart-context"
import { ShoppingCart, Minus, Plus } from "lucide-react"
import { useParams, useRouter } from "next/navigation"

/**
 * Quick add-to-cart for product cards, with an inline quantity stepper.
 *
 * - Multi-variant products need option selection, so the button routes to the
 *   product page instead.
 * - Single-variant products add optimistically; once in the cart the button
 *   turns into a −/＋ stepper that adjusts the line quantity (removing the line
 *   when it hits zero). Reads the live quantity from the optimistic cart, so
 *   the nav badge + dropdown stay in sync.
 */
export default function AddToCartButton({
  variantId,
  variantCount,
  productHref,
  title,
  thumbnail,
  unitPrice,
}: {
  variantId?: string
  variantCount: number
  productHref: string
  title?: string
  thumbnail?: string | null
  unitPrice?: number
}) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const router = useRouter()
  const { cart, addItem, updateItem, deleteItem } = useCart()

  const isQuickAddable = !!variantId && variantCount <= 1
  const line = isQuickAddable
    ? cart?.items?.find((i) => i.variant_id === variantId)
    : undefined
  const quantity = line?.quantity ?? 0
  const lineId = line?.id

  const handleAdd = async () => {
    if (!isQuickAddable) {
      router.push(`/${countryCode}${productHref}`)
      return
    }
    await addItem({
      variantId: variantId!,
      quantity: 1,
      countryCode,
      seed: {
        title,
        product_title: title,
        product_handle: productHref.replace(/^\/products\//, ""),
        thumbnail: thumbnail ?? null,
        unit_price: unitPrice,
      },
    }).catch(() => {})
  }

  const increment = () => {
    if (lineId) updateItem({ lineId, quantity: quantity + 1 })
  }

  const decrement = () => {
    if (!lineId) return
    if (quantity <= 1) {
      deleteItem(lineId)
    } else {
      updateItem({ lineId, quantity: quantity - 1 })
    }
  }

  if (isQuickAddable && quantity > 0) {
    return (
      <div className="flex items-center justify-between w-full rounded-lg border border-primary bg-primary/5 py-1.5 px-1.5">
        <button
          onClick={decrement}
          aria-label="Decrease quantity"
          className="flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary hover:text-white transition-colors"
        >
          <Minus size={14} />
        </button>
        <span className="text-sm font-semibold text-primary tabular-nums" aria-live="polite">
          {quantity} in cart
        </span>
        <button
          onClick={increment}
          aria-label="Increase quantity"
          className="flex h-7 w-7 items-center justify-center rounded-md text-primary hover:bg-primary hover:text-white transition-colors"
        >
          <Plus size={14} />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleAdd}
      className="w-full bg-primary text-white hover:bg-primary-dark disabled:opacity-60 py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
      aria-label="Add to cart"
    >
      <ShoppingCart size={14} /> Add To Cart
    </button>
  )
}
