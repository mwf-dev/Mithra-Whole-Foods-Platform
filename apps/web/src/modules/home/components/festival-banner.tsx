import Image from "next/image"
import { ArrowRight } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { FESTIVAL } from "@modules/home/aisles"

// Lamp positions as % of the poster, so they scale with it.
const LAMPS = [
  { left: "8%", top: "22%", delay: "0s" },
  { left: "44%", top: "12%", delay: "0.8s" },
  { left: "90%", top: "30%", delay: "1.5s" },
  { left: "60%", top: "70%", delay: "0.4s" },
  { left: "22%", top: "78%", delay: "1.1s" },
]

/**
 * Seasonal poster slot. The pack is the real cut-out; the backdrop is CSS, and
 * the headline is live text rather than baked into an image. Disappears on its
 * own once `FESTIVAL.until` has passed, so a stale Diwali banner can't linger.
 */
export function FestivalBanner() {
  if (Date.now() > new Date(FESTIVAL.until).getTime()) {
    return null
  }

  const c = FESTIVAL.colors

  return (
    <section className="content-container py-6 md:py-10">
      <LocalizedClientLink
        href={FESTIVAL.href}
        className="mithra-reveal group relative grid overflow-hidden rounded-large md:grid-cols-[1.1fr_1fr] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        style={{
          color: c.ink,
          background: `radial-gradient(120% 90% at 70% 120%, ${c.lamp} 0%, ${c.dusk} 48%, ${c.night} 100%)`,
        }}
      >
        {LAMPS.map((lamp, i) => (
          <span
            key={i}
            aria-hidden
            className="mithra-lamp absolute h-1.5 w-1.5 rounded-full"
            style={{
              left: lamp.left,
              top: lamp.top,
              animationDelay: lamp.delay,
              backgroundColor: c.accent,
              boxShadow: `0 0 16px 5px ${c.lamp}`,
            }}
          />
        ))}

        <div className="relative z-10 flex flex-col justify-center gap-4 p-8 md:p-12">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: c.accent }}
          >
            {FESTIVAL.eyebrow}
          </p>
          <h2 className="font-display text-3xl leading-[1.04] md:text-5xl text-balance">
            {FESTIVAL.headline}
          </h2>
          <p className="max-w-md text-sm md:text-base opacity-85">{FESTIVAL.line}</p>
          <span
            className="mt-2 inline-flex w-max items-center gap-2 rounded-rounded px-5 py-3 text-sm font-semibold transition-transform group-hover:translate-x-0.5"
            style={{ backgroundColor: c.accent, color: c.night }}
          >
            {FESTIVAL.cta} <ArrowRight size={16} aria-hidden />
          </span>
        </div>

        <div className="relative h-56 md:h-auto md:min-h-[22rem]">
          <Image
            src={FESTIVAL.image}
            alt={FESTIVAL.imageAlt}
            fill
            loading="lazy"
            quality={75}
            sizes="(max-width: 768px) 100vw, 45vw"
            className="object-contain object-bottom p-4 drop-shadow-[0_16px_18px_rgba(0,0,0,0.5)] transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      </LocalizedClientLink>
    </section>
  )
}
