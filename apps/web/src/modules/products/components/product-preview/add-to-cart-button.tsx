"use client"

import { useCart } from "@lib/context/cart-context"
import { ShoppingCart, Check } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

/**
 * Quick add-to-cart for product cards. Single-variant products go straight
 * into the cart optimistically (the nav badge + dropdown update instantly via
 * the cart context); multi-variant products need option selection, so we send
 * the shopper to the product page instead.
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
  const { addItem } = useCart()
  const [added, setAdded] = useState(false)
  const [error, setError] = useState(false)

  const handleClick = async () => {
    if (!variantId || variantCount > 1) {
      router.push(`/${countryCode}${productHref}`)
      return
    }

    // Optimistic: flip to "Added" immediately, let the context reconcile.
    setError(false)
    setAdded(true)
    const timer = setTimeout(() => setAdded(false), 2000)

    try {
      await addItem({
        variantId,
        quantity: 1,
        countryCode,
        seed: {
          title,
          product_title: title,
          product_handle: productHref.replace(/^\/products\//, ""),
          thumbnail: thumbnail ?? null,
          unit_price: unitPrice,
        },
      })
    } catch {
      clearTimeout(timer)
      setAdded(false)
      setError(true)
      setTimeout(() => setError(false), 3000)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="w-full bg-primary text-white hover:bg-primary-dark disabled:opacity-60 py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-semibold transition-colors"
      aria-label="Add to cart"
    >
      {error ? (
        "Try again"
      ) : added ? (
        <>
          <Check size={14} /> Added
        </>
      ) : (
        <>
          <ShoppingCart size={14} /> Add To Cart
        </>
      )}
    </button>
  )
}
