"use client"

import { Button } from "@medusajs/ui"
import { useCart } from "@lib/context/cart-context"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

type BuyAgainItem = {
  variant_id?: string | null
  quantity: number
  title?: string | null
  product_title?: string | null
  product_handle?: string | null
  thumbnail?: string | null
  unit_price?: number | null
}

/**
 * Re-add every line item from a past order to the cart, then send the shopper
 * to the cart. Grocery is habitual — this is the "buy again" reorder shortcut.
 */
export default function BuyAgainButton({ items }: { items: BuyAgainItem[] }) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const router = useRouter()
  const { addItem } = useCart()
  const [loading, setLoading] = useState(false)

  const handleBuyAgain = async () => {
    setLoading(true)
    for (const item of items) {
      if (!item.variant_id) continue
      await addItem({
        variantId: item.variant_id,
        quantity: item.quantity,
        countryCode,
        source: "buy_again",
        seed: {
          title: item.title ?? undefined,
          product_title: item.product_title ?? undefined,
          product_handle: item.product_handle ?? undefined,
          thumbnail: item.thumbnail ?? null,
          unit_price: item.unit_price ?? undefined,
        },
      }).catch(() => {})
    }
    setLoading(false)
    router.push(`/${countryCode}/cart`)
  }

  return (
    <Button
      variant="primary"
      isLoading={loading}
      onClick={handleBuyAgain}
      data-testid="buy-again-button"
    >
      Buy again
    </Button>
  )
}
