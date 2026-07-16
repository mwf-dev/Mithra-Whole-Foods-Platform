"use client"

import { Heart } from "lucide-react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { useState, useTransition } from "react"

import { toggleWishlist } from "@lib/data/wishlist"

/**
 * Wishlist toggle. Favouriting requires an account: guests are sent to sign in
 * / sign up (then returned here), signed-in shoppers have the product saved to
 * their wishlist. Optimistically flips the heart for instant feedback.
 */
export default function WishlistHeart({
  title,
  handle,
  initialSaved = false,
}: {
  title: string
  handle?: string
  initialSaved?: boolean
}) {
  const { countryCode } = useParams<{ countryCode: string }>()
  const pathname = usePathname()
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [, startTransition] = useTransition()

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        if (!handle) return
        setSaved((s) => !s)
        startTransition(async () => {
          const result = await toggleWishlist(handle)
          if (result.needsAuth) {
            setSaved(false)
            router.push(
              `/${countryCode}/account?redirect=${encodeURIComponent(pathname)}`
            )
          } else {
            setSaved(result.saved)
          }
        })
      }}
      aria-label={
        saved ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`
      }
      aria-pressed={saved}
      className="absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-card-sm transition-transform hover:scale-110"
    >
      <Heart
        size={16}
        className={
          saved ? "fill-terracotta text-terracotta" : "text-charcoal/60"
        }
      />
    </button>
  )
}
