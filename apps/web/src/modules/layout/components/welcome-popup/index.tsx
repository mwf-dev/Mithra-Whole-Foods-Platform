"use client"

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react"
import { ArrowRight, Check, X } from "lucide-react"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { WELCOME_OPEN_FLAG, WELCOME_SETTLED_EVENT } from "@modules/layout/components/chatbot/events"

import type { WelcomeCard } from "./cards"
import { EMPTY_STATE, pickCard, type RotationState } from "./rotation"

/** Long enough to read the page first; short enough to still feel like a greeting. */
const DELAY_MS = 3500

const STORAGE_KEY = "mithra:welcome:v1"
/** One card per browsing session, however many pages they open. */
const SESSION_KEY = "mithra:welcome:shown"

const readState = (): RotationState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return {
        seen: Array.isArray(parsed.seen) ? parsed.seen : [],
        last: typeof parsed.last === "string" ? parsed.last : undefined,
        featured: parsed.featured && typeof parsed.featured === "object" ? parsed.featured : {},
      }
    }
  } catch {
    // Storage blocked or corrupt: rotate from scratch rather than fail.
  }
  return EMPTY_STATE
}

const writeState = (state: RotationState) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Private mode / quota: the session flag still stops repeats this visit.
  }
}

const localToday = () => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Tells the support chat it can greet now that this popup is out of the way. */
const settle = () => {
  const w = window as unknown as Record<string, boolean>
  w[WELCOME_OPEN_FLAG] = false
  w.__mithraWelcomeSettled = true
  window.dispatchEvent(new Event(WELCOME_SETTLED_EVENT))
}

/**
 * The card visitors see a few seconds after arriving: a sign-up invite for
 * guests, a product spotlight, or a card the admin scheduled for today.
 *
 * Dismissible, and never more than one per browsing session. Which card comes
 * next is remembered in the browser (see `rotation.ts`) so repeat visitors see
 * something different each time rather than the same invite.
 */
export default function WelcomePopup({ cards }: { cards: WelcomeCard[] }) {
  const pathname = usePathname()
  const [card, setCard] = useState<WelcomeCard | null>(null)
  const [open, setOpen] = useState(false)
  const decided = useRef(false)

  // Never interrupt someone who is already signing in, or paying.
  const blocked = /\/(account|checkout|cart)(\/|$)/.test(pathname ?? "")

  useEffect(() => {
    if (decided.current) return

    let alreadyShown = false
    try {
      alreadyShown = window.sessionStorage.getItem(SESSION_KEY) === "1"
    } catch {
      // Storage blocked: fall through; the ref below still limits it to one.
    }

    if (alreadyShown || cards.length === 0) {
      decided.current = true
      settle()
      return
    }
    if (blocked) {
      // Wait: they may wander back to browsing. The chat shouldn't wait on this.
      settle()
      return
    }

    const timer = setTimeout(() => {
      decided.current = true
      const { card: picked, next } = pickCard(cards, readState(), localToday())
      if (!picked) {
        settle()
        return
      }
      writeState(next)
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1")
      } catch {
        // see above
      }
      ;(window as unknown as Record<string, boolean>)[WELCOME_OPEN_FLAG] = true
      setCard(picked)
      setOpen(true)
    }, DELAY_MS)
    return () => clearTimeout(timer)
  }, [blocked, cards])

  const close = () => {
    setOpen(false)
    settle()
  }

  if (!card) return null

  const { world } = card
  const href =
    card.kind === "signup"
      ? `/account?redirect=${encodeURIComponent(pathname ?? "/")}`
      : card.href
  const external = /^https?:\/\//.test(href)

  const cta = (
    <span
      className="group/cta inline-flex h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-base font-semibold text-white shadow-card transition-transform hover:-translate-y-0.5 sm:w-auto"
      style={{ backgroundColor: card.kind === "signup" ? "#2E5C31" : world.deep }}
    >
      {card.cta}
      <ArrowRight size={18} aria-hidden className="transition-transform group-hover/cta:translate-x-1" />
    </span>
  )

  return (
    <Dialog open={open} onClose={close} className="relative z-[160]">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 data-[closed]:opacity-0"
      />
      {/* Centred on every screen. The box is pinned to the SMALL viewport height
          (svh) so on phones the centre is the middle of what is actually visible,
          not of the area behind a retracting browser toolbar. */}
      <div className="fixed inset-x-0 top-0 flex h-[100svh] items-center justify-center overflow-hidden p-3 sm:p-6">
        <DialogPanel
          transition
          className="relative grid max-h-[calc(100svh-1.5rem)] w-full max-w-[54rem] grid-rows-[8.5rem_minmax(0,1fr)] overflow-hidden rounded-3xl bg-white shadow-2xl transition duration-500 ease-out data-[closed]:translate-y-8 data-[closed]:scale-95 data-[closed]:opacity-0 sm:max-h-[90dvh] sm:grid-cols-[1.05fr_1fr] sm:grid-rows-1"
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-charcoal shadow-card-sm transition hover:bg-white hover:scale-105"
          >
            <X size={18} />
          </button>

          {/* Visual panel */}
          <div
            className="relative min-h-0 overflow-hidden"
            style={{ backgroundColor: world.bg, color: world.ink }}
          >
            <div
              aria-hidden
              className="absolute left-1/2 top-1/2 aspect-square w-[85%] -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.34), rgba(255,255,255,0) 68%)",
              }}
            />

            {card.kind === "signup" && card.collage ? (
              <div className="absolute inset-0">
                {card.collage.map((src, i) => {
                  // Left pack leans left, right pack leans right, the middle
                  // one stands tallest in front.
                  const spot = [
                    "left-[6%] top-[16%] h-[66%] w-[32%] -rotate-6 sm:top-[22%]",
                    "left-[28%] top-[6%] z-10 h-[84%] w-[44%] sm:top-[12%] sm:h-[76%]",
                    "right-[6%] top-[16%] h-[66%] w-[32%] rotate-6 sm:top-[22%]",
                  ][i]
                  return (
                    <div key={src} className={`absolute ${spot}`}>
                      <div className="mithra-float absolute inset-0" style={{ animationDelay: `${i * 0.9}s` }}>
                        <Image
                          src={src}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 30vw, 220px"
                          quality={75}
                          priority
                          className="object-contain drop-shadow-[0_14px_14px_rgba(0,0,0,0.35)]"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : card.image ? (
              <div className="absolute inset-3 sm:inset-6">
                <div className="mithra-float absolute inset-0">
                  <Image
                    src={card.image}
                    alt=""
                    fill
                    sizes="(max-width: 640px) 90vw, 420px"
                    quality={75}
                    priority
                    className="object-contain drop-shadow-[0_18px_18px_rgba(0,0,0,0.3)]"
                  />
                </div>
              </div>
            ) : card.imageUrl ? (
              <div
                className="absolute inset-4 bg-contain bg-center bg-no-repeat sm:inset-8"
                style={{ backgroundImage: `url('${card.imageUrl}')` }}
              />
            ) : null}
          </div>

          {/* Content */}
          <div className="flex min-h-0 flex-col justify-center gap-2.5 overflow-y-auto p-5 pb-0 sm:gap-4 sm:p-9">
            {card.badge && (
              <span
                className="w-max rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ backgroundColor: world.bg, color: world.ink }}
              >
                {card.badge}
              </span>
            )}
            <h2 className="font-display text-[1.45rem] leading-[1.08] text-charcoal sm:text-[2.1rem]">
              {card.title}
            </h2>
            {card.subtitle && (
              <p className="line-clamp-3 text-sm leading-relaxed text-grey-60 sm:text-[15px]">{card.subtitle}</p>
            )}

            {card.chips && card.chips.length > 0 && (
              <ul className={card.kind === "signup" ? "grid gap-2" : "flex flex-wrap gap-2"}>
                {card.chips.map((chip) =>
                  card.kind === "signup" ? (
                    <li key={chip} className="flex items-center gap-2.5 text-sm font-medium text-charcoal">
                      <span
                        aria-hidden
                        className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-white"
                      >
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {chip}
                    </li>
                  ) : (
                    <li
                      key={chip}
                      className="rounded-full border px-3 py-1 text-xs font-semibold"
                      style={{ borderColor: world.deep, color: world.deep }}
                    >
                      {chip}
                    </li>
                  )
                )}
              </ul>
            )}

            <div className="sticky bottom-0 mt-1 flex flex-col items-stretch gap-1 bg-white pb-3 pt-2 sm:static sm:flex-row sm:items-center sm:gap-3 sm:pb-0 sm:pt-0">
              {external ? (
                <a href={href} onClick={close}>
                  {cta}
                </a>
              ) : (
                <LocalizedClientLink href={href} onClick={close}>
                  {cta}
                </LocalizedClientLink>
              )}
              <button
                type="button"
                onClick={close}
                className="whitespace-nowrap py-2 text-sm font-medium text-grey-50 underline-offset-4 transition-colors hover:text-charcoal hover:underline"
              >
                {card.kind === "signup" ? "Continue browsing" : "Not now"}
              </button>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  )
}
