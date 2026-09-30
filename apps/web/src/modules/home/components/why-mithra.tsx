"use client"

import { useState } from "react"
import Image from "next/image"
import { WHY_MITHRA } from "@modules/home/aisles"

/**
 * "Why Mithra" as expanding panels: one open at a time, opened by hover on
 * devices that hover and by tap/focus everywhere. On phones the panels stack
 * and the open one grows taller instead of wider. The copy on every panel is
 * also in the DOM when collapsed (clipped with max-height, not removed), so
 * nothing is lost to a screen reader.
 */
export function WhyMithra() {
  const [open, setOpen] = useState(0)

  const hoverOpen = (i: number) => {
    if (window.matchMedia("(hover: hover)").matches) setOpen(i)
  }

  return (
    <section className="bg-white py-12 md:py-16" aria-labelledby="why-heading">
      <div className="content-container">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Why Mithra
        </p>
        <h2 id="why-heading" className="mb-8 font-display text-3xl leading-[1.1] md:text-4xl text-charcoal">
          Traditional food, handled with care
        </h2>

        <div className="flex flex-col gap-3 md:h-[24rem] md:flex-row">
          {WHY_MITHRA.map((panel, i) => {
            const isOpen = i === open
            return (
              <button
                key={panel.title}
                type="button"
                aria-expanded={isOpen}
                onClick={() => setOpen(i)}
                onFocus={() => setOpen(i)}
                onMouseEnter={() => hoverOpen(i)}
                className={`relative overflow-hidden rounded-large text-left text-white transition-all duration-500 ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  isOpen ? "h-64 md:h-auto md:flex-[3.4]" : "h-20 md:h-auto md:flex-1"
                }`}
                style={{ backgroundColor: panel.bg }}
              >
                <Image
                  src={panel.image}
                  alt=""
                  fill
                  loading="lazy"
                  quality={60}
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={`transition-transform duration-1000 ${
                    panel.fit === "contain" ? "object-contain p-4" : "object-cover"
                  } ${isOpen ? "scale-105" : "scale-100"}`}
                />
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
                />
                <span className="absolute inset-x-4 bottom-4 flex flex-col gap-1.5 md:inset-x-5 md:bottom-5">
                  <span className="font-display text-xl leading-tight md:text-2xl">
                    {panel.title}
                  </span>
                  <span
                    className={`max-w-md overflow-hidden text-sm leading-relaxed text-white/90 transition-all duration-300 ${
                      isOpen ? "max-h-40 opacity-100 delay-200" : "max-h-0 opacity-0"
                    }`}
                  >
                    {panel.body}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
