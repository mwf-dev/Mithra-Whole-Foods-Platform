"use client"

import Image from "next/image"
import { usePathname, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Full-screen brand overlay shown while a navigation is in flight.
 *
 * Purpose is perceived performance: a click that does nothing for a second
 * reads as broken, whereas the same second with a visible response reads as
 * loading. The overlay also blocks input while it is up, which incidentally
 * stops the double-clicks that used to queue two navigations.
 *
 * ## The two timings, and why neither is "always show it for 1s"
 *
 * `SHOW_AFTER_MS` — nothing appears until a navigation has already been slow.
 * Most navigations here are now well under this (the cart renders from client
 * context in ~286ms), and flashing a loading screen over an instant transition
 * makes a fast site feel *busier*, not faster. Below this threshold the user
 * sees the new page directly, which is the best possible outcome.
 *
 * `MIN_VISIBLE_MS` — once the overlay *is* up, it stays up for at least this
 * long. Without it, a navigation that resolves at 210ms would flash the logo
 * for 60ms, which is worse than never showing it.
 *
 * Deliberately *not* implemented: a fixed minimum delay on every navigation.
 * That would add real latency to every click to disguise latency on some of
 * them — the fast paths we just built would be thrown away. If a longer,
 * always-on animation is wanted later, raise MIN_VISIBLE_MS rather than
 * lowering SHOW_AFTER_MS to zero.
 */

/** Wait this long before showing anything — fast navigations never flash. */
const SHOW_AFTER_MS = 180

/** Once visible, stay visible at least this long. */
const MIN_VISIBLE_MS = 450

/** Fade duration; must match the CSS transition below. */
const FADE_MS = 220

/**
 * Safety valve. If a navigation never completes (a hard failure, or a click we
 * misread as a route change), the overlay must not strand the page behind it.
 */
const MAX_VISIBLE_MS = 8000

export default function RouteTransitionOverlay() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [visible, setVisible] = useState(false)
  const [mounted, setMounted] = useState(false)

  /**
   * Mirrors `visible` so `hide()` can branch on it without doing side effects
   * inside a `setState` updater — React may run an updater more than once, and
   * calling `setMounted` from inside one is not safe.
   */
  const visibleRef = useRef(false)

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shownAt = useRef<number>(0)

  const clearTimers = useCallback(() => {
    for (const t of [showTimer, hideTimer, unmountTimer, maxTimer]) {
      if (t.current) {
        clearTimeout(t.current)
        t.current = null
      }
    }
  }, [])

  const hide = useCallback(() => {
    if (showTimer.current) {
      clearTimeout(showTimer.current)
      showTimer.current = null
    }
    if (maxTimer.current) {
      clearTimeout(maxTimer.current)
      maxTimer.current = null
    }

    if (!visibleRef.current) {
      // Never made it past SHOW_AFTER_MS — tear down with no flash at all.
      setMounted(false)
      return
    }

    const elapsed = Date.now() - shownAt.current
    const wait = Math.max(0, MIN_VISIBLE_MS - elapsed)

    hideTimer.current = setTimeout(() => {
      visibleRef.current = false
      setVisible(false)
      // Keep it mounted through the fade so the opacity transition can run.
      unmountTimer.current = setTimeout(() => setMounted(false), FADE_MS)
    }, wait)
  }, [])

  const start = useCallback(() => {
    clearTimers()
    setMounted(true)

    showTimer.current = setTimeout(() => {
      shownAt.current = Date.now()
      visibleRef.current = true
      setVisible(true)
    }, SHOW_AFTER_MS)

    maxTimer.current = setTimeout(() => {
      visibleRef.current = false
      setVisible(false)
      setMounted(false)
    }, MAX_VISIBLE_MS)
  }, [clearTimers])

  /**
   * Navigation *finished*: the App Router has committed the new route, which is
   * the point at which `pathname` / `searchParams` change. Running on mount too
   * is harmless — there is nothing to hide.
   *
   * Depends on the *serialised* search string, never the `useSearchParams()`
   * object. That object gets a fresh identity on every re-render, and this
   * component re-renders whenever it shows or hides — so depending on it made
   * the effect re-run continuously, calling `hide()` in a loop and clearing the
   * show timer before it could ever fire. Measured symptom: the overlay mounted
   * on time but sat at opacity 0 for the whole navigation, i.e. invisible.
   */
  const search = searchParams.toString()
  useEffect(() => {
    hide()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search])

  /**
   * Navigation *started*. The App Router exposes no router events, so this is
   * inferred from two sources:
   *
   *  - a capture-phase click on an in-app anchor, which covers every `<Link>`
   *  - a patched `history.pushState` / `replaceState`, which covers
   *    `router.push` / `router.replace` (sort, filter, paginate, checkout steps)
   *
   * Capture phase matters: React's own handlers and `preventDefault` run later,
   * so this sees the click regardless of what the component does with it.
   */
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      // Anything but a plain left click is the browser's job, not ours.
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return
      }

      const anchor = (event.target as Element | null)?.closest?.("a")
      if (!anchor) return

      const href = anchor.getAttribute("href")
      if (!href) return

      // New tab, downloads, and non-navigational schemes (mailto:, tel:, #).
      if (
        anchor.hasAttribute("download") ||
        (anchor.getAttribute("target") ?? "") === "_blank" ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:")
      ) {
        return
      }

      let url: URL
      try {
        url = new URL(anchor.href, window.location.href)
      } catch {
        return
      }

      // External origin — the browser takes over and unloads this page anyway.
      if (url.origin !== window.location.origin) return

      // Same page (or a pure hash change): no route commit will follow, so the
      // overlay would hang until MAX_VISIBLE_MS.
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return
      }

      start()
    }

    document.addEventListener("click", onClick, { capture: true })

    const { pushState, replaceState } = window.history
    const wrap =
      (original: typeof pushState) =>
      function (this: History, ...args: Parameters<typeof pushState>) {
        const next = args[2]
        if (next != null) {
          try {
            const url = new URL(String(next), window.location.href)
            if (
              url.pathname !== window.location.pathname ||
              url.search !== window.location.search
            ) {
              start()
            }
          } catch {
            // Unparseable target — skip rather than risk a stuck overlay.
          }
        }
        return original.apply(this, args)
      }

    window.history.pushState = wrap(pushState)
    window.history.replaceState = wrap(replaceState)

    // Back/forward buttons.
    const onPopState = () => start()
    window.addEventListener("popstate", onPopState)

    return () => {
      document.removeEventListener("click", onClick, { capture: true })
      window.history.pushState = pushState
      window.history.replaceState = replaceState
      window.removeEventListener("popstate", onPopState)
      clearTimers()
    }
  }, [start, clearTimers])

  if (!mounted) return null

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading"
      // `pointer-events` follows visibility so the overlay only swallows clicks
      // once it is actually on screen — during the initial SHOW_AFTER_MS window
      // the page must stay fully interactive.
      className={`fixed inset-0 z-[200] flex items-center justify-center bg-white/95 backdrop-blur-[2px] transition-opacity duration-[220ms] ease-out ${
        visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex flex-col items-center gap-7">
        {/*
          The dominant element on screen while this is up, by design — a small
          logo here reads as decoration, a large one reads as the page telling
          you something is happening. `clamp()` keeps it a fixed *proportion*
          of the viewport (min 6rem, max 11.5rem) rather than jumping between
          breakpoints, and it never animates: it is the calm anchor the sprout
          mark below plays against.
        */}
        <Image
          src="/logo.png"
          alt=""
          width={355}
          height={130}
          priority
          className="h-[clamp(6rem,18vw,11.5rem)] w-auto object-contain"
        />
        <span className="sr-only">Loading</span>
        {/*
          Loading mark: the brand's own tree glyph (same paths as the Logo
          component's text-fallback mark, so the two are visually the same
          motif) sprouting on a loop instead of a generic spinner or bar — the
          stem draws upward, the leaves unfurl staggered, then everything
          retracts and regrows. Three keyframes animate in lockstep on one
          element each; see tailwind.config.js for the full timeline.
          `motion-safe` only: the glyph still shows under
          prefers-reduced-motion, just fully grown and holding still, because
          the base (non-animated) SVG values below already describe that state.
        */}
        <svg
          aria-hidden
          viewBox="0 0 40 40"
          className="h-11 w-11 text-[#2E5C31]"
        >
          <path
            d="M20 34V17"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray="18"
            className="motion-safe:animate-[routeLoaderStem_2.4s_ease-in-out_infinite]"
          />
          <path
            d="M20 20C20 13 15 8 7 8c0 7 5 12 13 12Z"
            fill="currentColor"
            opacity="0.9"
            style={{ transformOrigin: "20px 17px" }}
            className="motion-safe:animate-[routeLoaderLeafLeft_2.4s_ease-in-out_infinite]"
          />
          <path
            d="M20 24c0-6 4.5-10.5 12-10.5C32 19.5 27.5 24 20 24Z"
            fill="currentColor"
            opacity="0.55"
            style={{ transformOrigin: "20px 20px" }}
            className="motion-safe:animate-[routeLoaderLeafRight_2.4s_ease-in-out_infinite]"
          />
        </svg>
      </div>
    </div>
  )
}
