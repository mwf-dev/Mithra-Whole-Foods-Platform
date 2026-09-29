import { Star } from "lucide-react"

/**
 * Read-only star display. Renders a half-open star for fractional averages by
 * clipping a filled layer over an empty one, so 4.3 doesn't round up to a
 * rating the product didn't earn.
 */
export default function StarRating({
  rating,
  size = 16,
  className = "",
}: {
  rating: number
  size?: number
  className?: string
}) {
  const clamped = Math.max(0, Math.min(5, rating))

  return (
    <span
      className={`relative inline-flex ${className}`}
      role="img"
      aria-label={`${clamped} out of 5 stars`}
    >
      <span className="flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={size} className="text-amber-300" />
        ))}
      </span>

      <span
        className="absolute inset-0 flex overflow-hidden"
        style={{ width: `${(clamped / 5) * 100}%` }}
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            size={size}
            className="shrink-0 fill-amber-400 text-amber-400"
          />
        ))}
      </span>
    </span>
  )
}
