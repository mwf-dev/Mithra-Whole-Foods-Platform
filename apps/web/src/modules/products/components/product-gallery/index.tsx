"use client"

import { HttpTypes } from "@medusajs/types"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import { useState } from "react"

const PLACEHOLDER =
  "https://placehold.co/800x800/f5f1e8/9caf88?text=Mithra+Whole+Foods"

/**
 * PDP image carousel. Renders every image attached to the product (upload as
 * many as you like in the admin — product shot, ingredients, nutrition, "about"
 * — and they all appear here) as a swipeable gallery with a large main image,
 * prev/next arrows, a thumbnail strip, and dot indicators.
 */
export default function ProductGallery({
  images,
  title,
}: {
  images: HttpTypes.StoreProductImage[]
  title: string
}) {
  const slides = images.length
    ? images
    : ([{ id: "placeholder", url: PLACEHOLDER }] as HttpTypes.StoreProductImage[])

  const [active, setActive] = useState(0)
  const hasMultiple = slides.length > 1

  const go = (next: number) => {
    const count = slides.length
    setActive(((next % count) + count) % count)
  }

  // Touch swipe
  const [touchX, setTouchX] = useState<number | null>(null)
  const onTouchStart = (e: React.TouchEvent) =>
    setTouchX(e.changedTouches[0].clientX)
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX === null) return
    const dx = e.changedTouches[0].clientX - touchX
    if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1))
    setTouchX(null)
  }

  return (
    <div className="w-full">
      {/* Main image */}
      <div
        className="relative aspect-square w-full overflow-hidden rounded-2xl bg-[#F7F4EE] group"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        data-testid="product-gallery"
      >
        {slides.map((image, i) => (
          <Image
            key={image.id}
            src={image.url}
            alt={`${title} — image ${i + 1}`}
            fill
            priority={i === 0}
            sizes="(max-width: 768px) 100vw, 45vw"
            className={`object-contain p-6 transition-opacity duration-300 ${
              i === active ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
          />
        ))}

        {hasMultiple && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => go(active - 1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#2E5C31] shadow-sm hover:bg-white transition md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(active + 1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-[#2E5C31] shadow-sm hover:bg-white transition md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight size={20} />
            </button>

            <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to image ${i + 1}`}
                  onClick={() => setActive(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === active ? "w-5 bg-[#2E5C31]" : "w-1.5 bg-[#2E5C31]/30"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Thumbnails */}
      {hasMultiple && (
        <div className="mt-4 flex gap-3 overflow-x-auto no-scrollbar pb-1">
          {slides.map((image, i) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === active}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-[#F7F4EE] transition ${
                i === active
                  ? "border-[#2E5C31]"
                  : "border-transparent hover:border-[#2E5C31]/40"
              }`}
            >
              <Image
                src={image.url}
                alt={`${title} thumbnail ${i + 1}`}
                fill
                sizes="64px"
                className="object-contain p-1.5"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
