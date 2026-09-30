import Image from "next/image"
import { ArrowRight } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Tilt from "@modules/common/components/tilt"
import { MOMENTS } from "@modules/home/aisles"

/**
 * "Shop by moment". Adapted from Two Brothers' "Shop by concern", but keyed
 * on occasions rather than health conditions — condition-based navigation is
 * a disease claim under US FDA rules.
 */
export function ShopByMoment() {
  return (
    <section className="bg-cream py-12 md:py-16" aria-labelledby="moment-heading">
      <div className="content-container">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Shop by moment
        </p>
        <h2 id="moment-heading" className="mb-8 font-display text-3xl leading-[1.1] md:text-4xl text-charcoal">
          What are you cooking today?
        </h2>

        <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {MOMENTS.map((m, i) => (
            <li key={m.title} className="mithra-reveal">
              <Tilt shine className="h-full rounded-large">
                <LocalizedClientLink
                  href={m.href}
                  className="group relative flex h-56 flex-col justify-between overflow-hidden rounded-large p-4 md:h-72 md:p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  style={{ background: m.background ?? m.world.bg, color: m.world.ink }}
                >
                  <span className="relative z-10">
                    <span className="block font-display text-2xl leading-tight md:text-[1.7rem]">
                      {m.title}
                    </span>
                    <span className="mt-1 block text-xs leading-snug opacity-85 md:text-sm">
                      {m.line}
                    </span>
                  </span>
                  <span className="relative z-10 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
                    Shop{" "}
                    <ArrowRight
                      size={14}
                      aria-hidden
                      className="transition-transform group-hover:translate-x-1"
                    />
                  </span>
                  <span className="absolute bottom-2 right-1 h-[60%] w-[62%] transition-transform duration-500 group-hover:-translate-y-2 group-hover:-rotate-3 group-hover:scale-105">
                    <span
                      className="mithra-bob absolute inset-0"
                      style={{ animationDelay: `${i * -1.1}s` }}
                    >
                      <Image
                        src={m.image}
                        alt=""
                        fill
                        loading="lazy"
                        quality={60}
                        sizes="(max-width: 768px) 30vw, 200px"
                        className="object-contain object-bottom drop-shadow-[0_10px_12px_rgba(0,0,0,0.3)]"
                      />
                    </span>
                  </span>
                </LocalizedClientLink>
              </Tilt>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
