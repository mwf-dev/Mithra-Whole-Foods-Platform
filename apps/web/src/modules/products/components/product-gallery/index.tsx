"use client"

import { Dialog, DialogPanel } from "@headlessui/react"
import { HttpTypes } from "@medusajs/types"
import { ChevronLeft, ChevronRight, Expand, Leaf, X } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"

/**
 * PDP gallery:
 *   - a large stage on a soft ground, image contained (packs are never cropped);
 *   - thumbnails in a strip *below* the stage on every screen size;
 *   - click/tap the stage to open a full-screen viewer — big image on a dark
 *     ground, arrows, swipe, arrow keys, Esc to close. No hover zoom: the
 *     client found it jumpy, and the full-screen view shows more detail.
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
  const [viewer, setViewer] = useState(false)
  const count = images.length
  const hasMultiple = count > 1

  const go = (next: number) => setActive(((next % count) + count) % count)
  const swipe = useSwipe((dir) => go(active + dir))

  // Arrow keys page the viewer wherever focus sits inside it.
  useEffect(() => {
    if (!viewer || count < 2) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setActive((a) => (a + 1) % count)
      if (e.key === "ArrowLeft") setActive((a) => (a - 1 + count) % count)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [viewer, count])

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

  const arrows = (variant: "stage" | "viewer") => {
    if (!hasMultiple) return null
    const base =
      variant === "stage"
        ? "h-11 w-11 bg-white/90 text-primary-dark shadow-card hover:bg-white md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100"
        : "h-12 w-12 bg-white/15 text-white hover:bg-white/25"
    return (
      <>
        <button
          type="button"
          aria-label="Previous image"
          onClick={(e) => {
            e.stopPropagation()
            go(active - 1)
          }}
          className={`absolute left-3 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full transition hover:scale-105 ${base}`}
        >
          <ChevronLeft size={24} aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Next image"
          onClick={(e) => {
            e.stopPropagation()
            go(active + 1)
          }}
          className={`absolute right-3 top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full transition hover:scale-105 ${base}`}
        >
          <ChevronRight size={24} aria-hidden />
        </button>
      </>
    )
  }

  const thumbs = (variant: "stage" | "viewer") => (
    <div
      className={`no-scrollbar flex gap-2.5 overflow-x-auto pb-1 ${
        variant === "viewer" ? "justify-center px-4" : ""
      }`}
    >
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
          <Image src={image.url} alt="" fill sizes="80px" quality={60} className="object-contain p-1" />
        </button>
      ))}
    </div>
  )

  return (
    <div className="flex w-full flex-col gap-3 md:gap-4">
      {/* Stage */}
      <div
        className="group relative aspect-square w-full cursor-zoom-in overflow-hidden rounded-large bg-cream outline-none focus-visible:ring-2 focus-visible:ring-primary"
        tabIndex={0}
        role="button"
        aria-roledescription="carousel"
        aria-label={`${title} images — open full screen`}
        onClick={() => setViewer(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(active + 1)
          if (e.key === "ArrowLeft") go(active - 1)
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            setViewer(true)
          }
        }}
        {...swipe}
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
              className="object-contain p-4 sm:p-8"
            />
          </div>
        ))}

        <span className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-charcoal shadow-card-sm">
          <Expand size={13} aria-hidden /> Tap to enlarge
        </span>

        {hasMultiple && (
          <span className="absolute right-3 top-3 rounded-full bg-charcoal/70 px-2.5 py-1 text-[11px] font-semibold tabular-nums text-white">
            {active + 1} / {count}
          </span>
        )}
        {arrows("stage")}
      </div>

      {hasMultiple && thumbs("stage")}

      {/* Full-screen viewer */}
      <Dialog open={viewer} onClose={() => setViewer(false)} className="relative z-[150]">
        <div className="fixed inset-0 bg-neutral-950" aria-hidden />
        <DialogPanel className="fixed inset-0 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 text-white">
            <span className="text-sm font-semibold tabular-nums">
              {hasMultiple ? `${active + 1} / ${count}` : title}
            </span>
            <button
              type="button"
              onClick={() => setViewer(false)}
              aria-label="Close full screen"
              className="grid h-11 w-11 place-items-center rounded-full bg-white/15 hover:bg-white/25"
            >
              <X size={22} aria-hidden />
            </button>
          </div>

          <div className="relative min-h-0 flex-1" {...swipe}>
            {images.map((image, i) =>
              i === active ? (
                <Image
                  key={image.id}
                  src={image.url}
                  alt={`${title} — image ${i + 1} of ${count}`}
                  fill
                  quality={75}
                  sizes="100vw"
                  className="object-contain p-2 sm:p-8"
                />
              ) : null
            )}
            {arrows("viewer")}
          </div>

          {hasMultiple && <div className="py-4">{thumbs("viewer")}</div>}
        </DialogPanel>
      </Dialog>
    </div>
  )
}

/** Horizontal swipe → onSwipe(+1 next / -1 previous). A tap is not a swipe. */
function useSwipe(onSwipe: (dir: 1 | -1) => void) {
  const startX = useRef<number | null>(null)
  const swiped = useRef(false)
  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX.current = e.changedTouches[0].clientX
      swiped.current = false
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (startX.current === null) return
      const dx = e.changedTouches[0].clientX - startX.current
      startX.current = null
      if (Math.abs(dx) > 40) {
        swiped.current = true
        onSwipe(dx < 0 ? 1 : -1)
      }
    },
    // A swipe ends in a synthetic click on touch devices; don't let it open
    // the viewer.
    onClickCapture: (e: React.MouseEvent) => {
      if (swiped.current) {
        swiped.current = false
        e.stopPropagation()
      }
    },
  }
}
