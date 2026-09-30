"use client"

import { HttpTypes } from "@medusajs/types"
import { ChevronLeft, ChevronRight, Leaf, ZoomIn } from "lucide-react"
import Image from "next/image"
import { useRef, useState } from "react"

/**
 * PDP gallery, Amazon/Flipkart style:
 *   - a large stage on a soft ground, image contained (packs are never cropped);
 *   - hover to magnify on desktop — the image scales 2x around the cursor;
 *   - vertical thumbnail rail on desktop, horizontal strip on phones;
 *   - swipe on touch, arrow keys when focused, a "2 / 5" counter.
 * Every image attached to the product in the admin appears here, in order —
 * put the white-background packshot first.
 */
export default function ProductGallery({
  images,
  title,
}: {
  images: HttpTypes.StoreProductImage[]
  title: string
}) {
  const [active, setActive] = useState(0)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  const touchX = useRef<number | null>(null)
  const count = images.length
  const hasMultiple = count > 1

  const go = (next: number) => {
    setZoom(null)
    setActive(((next % count) + count) % count)
  }

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return
    const r = e.currentTarget.getBoundingClientRect()
    setZoom({
      x: ((e.clientX - r.left) / r.width) * 100,
      y: ((e.clientY - r.top) / r.height) * 100,
    })
  }

  if (count === 0) {
    return (
      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-large bg-cream text-primary/30">
        <Leaf className="h-14 w-14" strokeWidth={1.25} aria-hidden />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-grey-40">
          Photo coming soon
        </span>
      </div>
    )
  }

  const thumbs = (
    <>
      {images.map((image, i) => (
        <button
          key={image.id}
          type="button"
          onClick={() => go(i)}
          aria-label={`View image ${i + 1} of ${count}`}
          aria-current={i === active}
          className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-rounded border-2 bg-white transition sm:h-20 sm:w-20 ${
            i === active
              ? "border-primary shadow-card"
              : "border-transparent opacity-70 hover:opacity-100 hover:border-primary/40"
          }`}
        >
          <Image
            src={image.url}
            alt=""
            fill
            sizes="80px"
            quality={60}
            className="object-contain p-1"
          />
        </button>
      ))}
    </>
  )

  return (
    <div className="flex w-full flex-col gap-3 md:flex-row-reverse md:gap-4">
      {/* Stage */}
      <div
        className="group relative aspect-square w-full overflow-hidden rounded-large bg-cream outline-none focus-visible:ring-2 focus-visible:ring-primary md:flex-1"
        tabIndex={0}
        role="region"
        aria-roledescription="carousel"
        aria-label={`${title} images`}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(active + 1)
          if (e.key === "ArrowLeft") go(active - 1)
        }}
        onPointerMove={onMove}
        onPointerLeave={() => setZoom(null)}
        onTouchStart={(e) => (touchX.current = e.changedTouches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current === null) return
          const dx = e.changedTouches[0].clientX - touchX.current
          if (Math.abs(dx) > 40) go(active + (dx < 0 ? 1 : -1))
          touchX.current = null
        }}
        data-testid="product-gallery"
      >
        {images.map((image, i) => (
          <div
            key={image.id}
            aria-hidden={i !== active}
            className={`absolute inset-0 transition-opacity duration-300 ${
              i === active ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <Image
              src={image.url}
              alt={`${title} — image ${i + 1} of ${count}`}
              fill
              priority={i === 0}
              quality={75}
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 55vw, 760px"
              className="object-contain p-4 sm:p-8 transition-transform duration-200 ease-out"
              style={
                i === active && zoom
                  ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%` }
                  : undefined
              }
            />
          </div>
        ))}

        <span className="pointer-events-none absolute left-3 top-3 hidden items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-charcoal shadow-card-sm transition-opacity md:flex md:group-hover:opacity-0">
          <ZoomIn size={13} aria-hidden /> Hover to zoom
        </span>

        {hasMultiple && (
          <>
            <span className="absolute right-3 top-3 rounded-full bg-charcoal/70 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white">
              {active + 1} / {count}
            </span>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => go(active - 1)}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary-dark shadow-card transition hover:scale-105 hover:bg-white md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronLeft size={22} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(active + 1)}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-primary-dark shadow-card transition hover:scale-105 hover:bg-white md:opacity-0 md:group-hover:opacity-100"
            >
              <ChevronRight size={22} aria-hidden />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails: a vertical rail beside the stage from md, a strip below on phones */}
      {hasMultiple && (
        <div className="no-scrollbar flex gap-2.5 overflow-x-auto pb-1 md:max-h-[40rem] md:w-20 md:flex-col md:overflow-y-auto md:overflow-x-visible md:pb-0">
          {thumbs}
        </div>
      )}
    </div>
  )
}
