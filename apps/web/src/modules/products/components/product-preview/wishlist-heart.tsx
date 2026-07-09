"use client"

import { Heart } from "lucide-react"
import { useState } from "react"

/**
 * Visual-only wishlist toggle (no persistence yet — wishlist backend doesn't
 * exist). Keeps its state per page view so the interaction feels real.
 */
export default function WishlistHeart({ title }: { title: string }) {
  const [saved, setSaved] = useState(false)

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setSaved((s) => !s)
      }}
      aria-label={saved ? `Remove ${title} from wishlist` : `Add ${title} to wishlist`}
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
