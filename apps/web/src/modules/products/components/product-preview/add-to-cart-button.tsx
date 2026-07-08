"use client"

import { addToCart } from "@lib/data/cart"
import { ShoppingCart, Check } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState, useTransition } from "react"

/**
 * Quick add-to-cart for product cards. Single-variant products go straight
 * into the cart; multi-variant products need option selection, so we send
 * the shopper to the product page instead.
 */
export default function AddToCartButton({
  variantId,
  variantCount,
  productHref,
}: {
  variantId?: string
  variantCount: number
  productHref: string
}) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const router = useRouter()
  const [added, setAdded] = useState(false)
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    if (!variantId || variantCount > 1) {
      router.push(`/${countryCode}${productHref}`)
      return
    }

    startTransition(async () => {
      try {
        setError(false)
        await addToCart({ variantId, quantity: 1, countryCode })
        setAdded(true)
        setTimeout(() => setAdded(false), 2000)
        router.refresh()
      } catch {
        setError(true)
        setTimeout(() => setError(false), 3000)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="w-full bg-[#4A5D23] text-white hover:bg-[#3A4A1A] disabled:opacity-60 py-2 rounded flex items-center justify-center gap-2 text-xs font-bold transition-colors"
      aria-label="Add to cart"
    >
      {isPending ? (
        "Adding..."
      ) : error ? (
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
