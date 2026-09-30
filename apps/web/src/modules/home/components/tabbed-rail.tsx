"use client"

import { useRef, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

export type RailTab = { id: string; label: string; content: React.ReactNode }

/**
 * Tabs over horizontally scrolling product rails. Every panel is rendered on
 * the server and only hidden here, so switching tabs costs no request and the
 * cards are in the HTML for crawlers. Arrows page the active rail on desktop;
 * phones swipe (scroll-snap).
 */
export function TabbedRail({
  tabs,
  heading,
  eyebrow,
  viewAll,
}: {
  tabs: RailTab[]
  heading: string
  eyebrow?: string
  viewAll?: React.ReactNode
}) {
  const [active, setActive] = useState(tabs[0]?.id)
  const panels = useRef<Record<string, HTMLDivElement | null>>({})

  const page = (dir: 1 | -1) => {
    const rail = panels.current[active!]?.querySelector<HTMLElement>("[data-rail]")
    rail?.scrollBy({ left: dir * rail.clientWidth * 0.85, behavior: "smooth" })
  }

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    e.preventDefault()
    const next = tabs[(i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length]
    setActive(next.id)
    document.getElementById(`tab-${next.id}`)?.focus()
  }

  return (
    <section className="bg-cream py-12 md:py-16" aria-labelledby="rail-heading">
      <div className="content-container">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {eyebrow}
              </p>
            )}
            <h2 id="rail-heading" className="font-display text-3xl leading-[1.1] md:text-4xl text-charcoal">
              {heading}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {viewAll}
            <div className="hidden md:flex gap-2">
              <button
                type="button"
                onClick={() => page(-1)}
                aria-label="Scroll products left"
                className="grid h-10 w-10 place-items-center rounded-full border border-beige bg-white text-charcoal transition hover:border-primary hover:text-primary"
              >
                <ChevronLeft size={18} aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => page(1)}
                aria-label="Scroll products right"
                className="grid h-10 w-10 place-items-center rounded-full border border-beige bg-white text-charcoal transition hover:border-primary hover:text-primary"
              >
                <ChevronRight size={18} aria-hidden />
              </button>
            </div>
          </div>
        </div>

        <div
          role="tablist"
          aria-label={heading}
          className="no-scrollbar -mx-6 mt-6 flex gap-2 overflow-x-auto px-6"
        >
          {tabs.map((tab, i) => {
            const selected = tab.id === active
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={`panel-${tab.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(tab.id)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  selected
                    ? "bg-primary-dark text-white"
                    : "bg-white text-charcoal border border-beige hover:border-primary/50"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`panel-${tab.id}`}
          role="tabpanel"
          aria-labelledby={`tab-${tab.id}`}
          hidden={tab.id !== active}
          ref={(el) => {
            panels.current[tab.id] = el
          }}
        >
          {tab.content}
        </div>
      ))}
    </section>
  )
}
