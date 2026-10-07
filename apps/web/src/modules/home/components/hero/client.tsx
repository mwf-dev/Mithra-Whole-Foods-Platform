"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { ArrowRight, Check, ChevronLeft, ChevronRight } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { AisleWorld } from "@modules/home/aisles"

export type HeroSlide = {
  id: string
  href: string
  world: AisleWorld
  kicker: string
  headline: string
  chips: string[]
  cta: string
  image: string
  imageAlt: string
  launching?: boolean
  /**
   * Full-bleed art for the slide: a landscape scene (3:2) with the packs and a
   * styled dish on the right and an empty, flat-colour left 40% where the
   * headline sits. No text is baked into the image. Slides without one keep the
   * pack-on-colour layout.
   */
  scene?: string
  /** Round sticker on the scene, e.g. "New" — drawn in HTML, never in the art. */
  badge?: string
}

const SLIDE_MS = 6500

// One fixed box for every slide so the page never jumps on rotation. Phones
// get a taller-than-wide box because the copy stacks over the pack.
const HERO_BOX = "h-[41rem] md:h-auto md:aspect-[2/1] md:max-h-[44rem]"

// Floating claim cards (desktop), stacked in a column beside the pack — never
// over the pack art. Each gets its own parallax depth, idle-float phase and a
// small sideways offset so the column reads as floating, not as a list.
// Phones show two inline under the headline instead.
const CHIP_SPOTS = [
  { depth: 22, delay: "0s", nudge: "translate-x-0" },
  { depth: 30, delay: "1.2s", nudge: "-translate-x-6" },
  { depth: 16, delay: "2.1s", nudge: "translate-x-2" },
]

// Parallax offsets are driven by two CSS variables on the hero root
// (--mx/--my, each -1…1) written straight to the DOM from pointermove, so the
// cursor never causes a React render.
const layer = (x: number, y: number, rotate = 0): React.CSSProperties => ({
  transform: `translate3d(calc(var(--mx) * ${x}px), calc(var(--my) * ${y}px), 0) rotate(calc(var(--mx) * ${rotate}deg))`,
  transition: "transform 400ms cubic-bezier(.2,.8,.2,1)",
})

/**
 * Scene slide: the image fills the box; the copy sits over its empty left
 * side on desktop. On phones the copy stacks above the scene instead, so the
 * art is never covered. Everything but the image is live HTML.
 */
function SceneSlide({
  slide,
  active,
  priority,
}: {
  slide: HeroSlide
  active: boolean
  priority: boolean
}) {
  const { world } = slide
  return (
    <div
      className="relative flex h-full flex-col md:block"
      style={{ backgroundColor: world.bg, color: world.ink }}
    >
      <div
        className={`relative z-10 flex flex-col gap-3 px-6 pt-8 pb-5 transition-all duration-700 ease-out md:absolute md:inset-y-0 md:left-0 md:w-[44%] md:justify-center md:gap-5 md:p-0 md:pl-[6%] ${
          active ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{slide.kicker}</span>
          {slide.launching && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: world.deep }}
            >
              Launching soon
            </span>
          )}
        </div>
        <h2 className="font-display text-[2.1rem] leading-[1.02] md:text-5xl lg:text-[3.6rem] text-balance max-w-[14ch]">
          {slide.headline}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {slide.chips.slice(0, 3).map((chip) => (
            <li
              key={chip}
              className="inline-flex items-center gap-1.5 rounded-full border border-current/40 bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-[2px] md:text-[13px]"
            >
              <Check size={14} strokeWidth={3} aria-hidden />
              {chip}
            </li>
          ))}
        </ul>
        <LocalizedClientLink
          href={slide.href}
          tabIndex={active ? 0 : -1}
          style={{ backgroundColor: world.deep }}
          className="group/cta mt-1 inline-flex w-max items-center gap-2 rounded-rounded px-6 py-3.5 text-sm font-semibold text-white shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {slide.cta}
          <ArrowRight size={16} aria-hidden className="transition-transform group-hover/cta:translate-x-1" />
        </LocalizedClientLink>
      </div>

      {/* Phones show the right two thirds of the scene (the packs), desktop the
          whole frame centred a little low so the table is never cropped. */}
      <div className="relative aspect-[6/5] w-full overflow-hidden md:absolute md:inset-0 md:aspect-auto">
        <Image
          src={slide.scene!}
          alt={slide.imageAlt}
          fill
          priority={priority}
          quality={75}
          sizes="(max-width: 768px) 100vw, 1440px"
          className={`object-cover object-right md:object-[50%_30%] transition-transform duration-[6500ms] ease-out ${
            active ? "scale-[1.04]" : "scale-100"
          }`}
        />
        {/* Phones: the copy block above is the slide's flat colour while the scene
            has its own slightly different backdrop and light. Fade only the scene's
            very top edge into the flat colour — any taller and it washes out the
            tops of tall packs (oil bottles) that start near the top. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-[-1px] h-[10%] md:hidden"
          style={{ background: `linear-gradient(to bottom, ${world.bg} 0%, ${world.bg}99 45%, transparent 100%)` }}
        />
        {slide.badge && (
          <span
            aria-hidden
            className="absolute right-4 top-4 grid h-20 w-20 -rotate-12 place-items-center rounded-full text-center text-[11px] font-extrabold uppercase leading-tight tracking-wide text-white shadow-card-lg md:right-[5%] md:top-[9%] md:h-28 md:w-28 md:text-sm"
            style={{ backgroundColor: world.deep }}
          >
            {slide.badge}
          </span>
        )}
      </div>
    </div>
  )
}

function ProductSlide({
  slide,
  active,
  priority,
  mounted,
}: {
  slide: HeroSlide
  active: boolean
  priority: boolean
  mounted: boolean
}) {
  const { world } = slide
  if (slide.scene) {
    return <SceneSlide slide={slide} active={active} priority={priority} />
  }
  return (
    <div
      className="flex h-full flex-col md:grid md:grid-cols-[1fr_1.25fr] md:items-center md:gap-6 px-6 pt-8 pb-12 md:px-[5%] md:py-0"
      style={{ backgroundColor: world.bg, color: world.ink }}
    >
      <div
        className={`relative z-10 flex flex-col gap-3 md:gap-5 transition-all duration-700 ease-out ${
          active ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
            {slide.kicker}
          </span>
          {slide.launching && (
            <span
              className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: world.deep }}
            >
              Launching soon
            </span>
          )}
        </div>
        <h2 className="font-display text-[2rem] leading-[1.02] md:text-5xl lg:text-6xl text-balance max-w-[14ch]">
          {slide.headline}
        </h2>
        {/* Phones: claims inline. From md they float around the pack instead. */}
        <ul className="flex flex-wrap gap-1.5 md:hidden">
          {slide.chips.slice(0, 2).map((chip) => (
            <li
              key={chip}
              className="rounded-full border border-current px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
            >
              {chip}
            </li>
          ))}
        </ul>
        <LocalizedClientLink
          href={slide.href}
          tabIndex={active ? 0 : -1}
          style={{ backgroundColor: world.deep }}
          className="group/cta mt-1 inline-flex w-max items-center gap-2 rounded-rounded px-5 py-3 text-sm font-semibold text-white shadow-card transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {slide.cta}
          <ArrowRight size={16} aria-hidden className="transition-transform group-hover/cta:translate-x-1" />
        </LocalizedClientLink>
      </div>

      {/* Pack column: the pack centred in its space with the floating claim
          cards in their own column to its right, so they never sit on the
          pack art. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center gap-4 md:h-full md:py-10">
        <div className="relative flex h-full min-h-0 w-full flex-1 items-center justify-center">
          {/* Soft light behind the pack; drifts the opposite way to the pack. */}
          <div
            aria-hidden
            className="absolute aspect-square w-[80%] max-w-[30rem] rounded-full"
            style={{
              ...layer(10, 8),
              background:
                "radial-gradient(circle, rgba(255,255,255,0.42), rgba(255,255,255,0) 68%)",
            }}
          />
          {mounted && (
            <div
              className={`relative h-full w-full transition-all duration-1000 ease-out ${
                active ? "translate-x-0 scale-100 opacity-100" : "translate-x-16 scale-90 opacity-0"
              }`}
            >
              <div className="absolute inset-0" style={layer(-18, -12, -2)}>
                <div className="mithra-float absolute inset-0">
                  <Image
                    src={slide.image}
                    alt={slide.imageAlt}
                    fill
                    priority={priority}
                    quality={75}
                    sizes="(max-width: 768px) 90vw, 50vw"
                    className="object-contain object-center drop-shadow-[0_22px_24px_rgba(0,0,0,0.32)] p-2 md:p-0"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Floating claim cards (desktop). */}
        <ul className="relative z-10 hidden shrink-0 flex-col items-start gap-5 md:flex">
          {slide.chips.slice(0, CHIP_SPOTS.length).map((chip, i) => {
            const spot = CHIP_SPOTS[i]
            return (
              <li
                key={chip}
                className={`${spot.nudge} transition-all duration-700 ease-out ${
                  active ? "opacity-100 scale-100" : "opacity-0 scale-75"
                }`}
                style={{ transitionDelay: active ? `${300 + i * 150}ms` : "0ms" }}
              >
                <div style={layer(spot.depth, spot.depth * 0.6)}>
                  <div
                    className="mithra-float flex items-center gap-2 whitespace-nowrap rounded-full bg-white/95 py-2 pl-2 pr-4 text-[13px] font-semibold text-charcoal shadow-card-lg backdrop-blur-sm"
                    style={{ animationDelay: spot.delay, animationDuration: `${5 + i}s` }}
                  >
                    <span
                      aria-hidden
                      className="grid h-7 w-7 place-items-center rounded-full"
                      style={{ backgroundColor: world.bg, color: world.ink }}
                    >
                      <Check size={14} strokeWidth={3} />
                    </span>
                    {chip}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

export function HeroClient({ slides = [] }: { slides?: HeroSlide[] }) {
  const count = slides.length
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const rootRef = useRef<HTMLElement>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const frame = useRef(0)

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    setReduceMotion(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduceMotion(e.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  // Mount each slide's image up to one ahead of the furthest reached: first
  // paint costs one image, and the next one is decoded before it slides in.
  const [maxSeen, setMaxSeen] = useState(0)
  useEffect(() => setMaxSeen((m) => Math.max(m, index)), [index])

  const go = (i: number) => setIndex((i + count) % count)

  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || reduceMotion) return
    const el = rootRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const my = ((e.clientY - rect.top) / rect.height) * 2 - 1
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty("--mx", mx.toFixed(3))
      el.style.setProperty("--my", my.toFixed(3))
    })
  }

  const resetPointer = () => {
    cancelAnimationFrame(frame.current)
    rootRef.current?.style.setProperty("--mx", "0")
    rootRef.current?.style.setProperty("--my", "0")
  }

  if (count === 0) return null

  return (
    <section
      ref={rootRef}
      aria-roledescription="carousel"
      aria-label="Featured products"
      className="w-full bg-white"
      style={{ ["--mx" as string]: 0, ["--my" as string]: 0 }}
      onPointerMove={onPointerMove}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => {
        setPaused(false)
        resetPointer()
      }}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) setPaused(false)
      }}
      // Swipe on touch screens. Touch events, not pointer events: as soon as
      // the browser starts treating a touch as a scroll it cancels the
      // pointer stream, so pointerup never arrived and swiping did nothing.
      // A mostly-horizontal drag of 40px+ pages the carousel; vertical drags
      // are left alone so the page still scrolls.
      onTouchStart={(e) => {
        const t = e.touches[0]
        swipe.current = { x: t.clientX, y: t.clientY }
        setPaused(true)
      }}
      onTouchEnd={(e) => {
        const start = swipe.current
        swipe.current = null
        setPaused(false)
        if (!start) return
        const t = e.changedTouches[0]
        const dx = t.clientX - start.x
        const dy = t.clientY - start.y
        if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
          go(index + (dx < 0 ? 1 : -1))
        }
      }}
    >
      {/* Wider than the 1440px content column so the card uses the side space
          on large screens. Equal padding above and below keeps the gap to the
          header and to the next section the same. */}
      <div className="relative mx-auto w-full max-w-[1488px] md:px-6 md:py-8">
        <div className={`relative touch-pan-y overflow-hidden md:rounded-large ${HERO_BOX}`}>
          {slides.map((slide, i) => {
            const active = i === index
            return (
              <div
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}: ${slide.headline}`}
                aria-hidden={!active}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                  active ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <ProductSlide
                  slide={slide}
                  active={active}
                  priority={i === 0}
                  mounted={i <= maxSeen + 1}
                />
              </div>
            )
          })}

          {count > 1 && (
            <>
              {/* Dots double as a progress bar. The active bar's CSS animation
                  *is* the timer: when it ends, the slide advances, and hover
                  or focus pauses both at once. Reduced motion: no auto-advance. */}
              <div className="absolute bottom-4 left-6 md:left-[6%] z-20 flex gap-1.5 rounded-full bg-black/25 px-2 py-1.5 backdrop-blur-sm">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => go(i)}
                    aria-label={`Show slide ${i + 1}`}
                    aria-current={i === index}
                    className={`relative h-1.5 overflow-hidden rounded-full bg-white/40 transition-all duration-300 ${
                      i === index ? "w-10" : "w-4 hover:bg-white/70"
                    }`}
                  >
                    {i === index && (
                      <span
                        key={index}
                        className="absolute inset-y-0 left-0 rounded-full bg-white"
                        style={
                          reduceMotion
                            ? { width: "100%" }
                            : {
                                animation: `mithra-progress ${SLIDE_MS}ms linear forwards`,
                                animationPlayState: paused ? "paused" : "running",
                              }
                        }
                        onAnimationEnd={() => go(index + 1)}
                      />
                    )}
                  </button>
                ))}
              </div>
              <div className="absolute bottom-3 right-4 z-20 hidden md:flex gap-2">
                <button
                  type="button"
                  onClick={() => go(index - 1)}
                  aria-label="Previous slide"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/85 text-charcoal shadow-card backdrop-blur-sm transition hover:scale-105 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <ChevronLeft size={20} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  aria-label="Next slide"
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/85 text-charcoal shadow-card backdrop-blur-sm transition hover:scale-105 hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                >
                  <ChevronRight size={20} aria-hidden />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}
