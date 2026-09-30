"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Pause, Play } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import type { Film } from "@modules/home/films"

/**
 * A brand film with its story told alongside: the film plays muted and looped,
 * and the step list lights up in time with it.
 *
 * Page weight is the constraint here (the homepage budget is ~1 MB), so:
 *   - nothing downloads until the section is near the viewport
 *     (`preload="none"` and no `src` until then);
 *   - phones and Save-Data connections get the 480p cut (~0.55 MB);
 *   - it pauses whenever it scrolls out of view.
 * Visitors who prefer reduced motion see the poster and a Play button; nothing
 * moves until they press it. A pause button is always available (WCAG 2.2.2).
 *
 * `variant="band"` is the full-bleed homepage section; `"card"` sits inside
 * page content (product pages).
 */
export function FilmStory({
  film,
  eyebrow,
  headline,
  body,
  cta,
  variant = "band",
}: {
  film: Film
  eyebrow: string
  headline: string
  body: string
  cta?: { label: string; href: string }
  variant?: "band" | "card"
}) {
  const rootRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [reduceMotion, setReduceMotion] = useState(false)
  const [chapter, setChapter] = useState(0)
  const [progress, setProgress] = useState(0)
  // Whether the section is on screen right now. A ref, because the video's
  // own `canplay` handler needs the live value, not a render's snapshot.
  const inView = useRef(false)

  useEffect(() => {
    setReduceMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches)
  }, [])

  // Load when near the viewport; play/pause as it enters and leaves.
  useEffect(() => {
    const root = rootRef.current
    const video = videoRef.current
    if (!root || !video) return

    const io = new IntersectionObserver(
      ([entry]) => {
        inView.current = entry.isIntersecting
        if (entry.isIntersecting) {
          if (!video.src) {
            const small =
              window.matchMedia("(max-width: 767px)").matches ||
              (navigator as any).connection?.saveData
            video.src = small ? film.src.sd : film.src.hd
            setLoaded(true)
          }
          if (!reduceMotion && !userPaused) {
            video.play().catch(() => {})
          }
        } else {
          video.pause()
        }
      },
      { rootMargin: "200px 0px", threshold: 0.25 }
    )
    io.observe(root)
    return () => io.disconnect()
  }, [film.src.hd, film.src.sd, reduceMotion, userPaused])

  const onTime = () => {
    const v = videoRef.current
    if (!v || !v.duration) return
    const t = v.currentTime
    let idx = 0
    film.chapters.forEach((c, i) => {
      if (t >= c.start) idx = i
    })
    setChapter(idx)
    const start = film.chapters[idx].start
    const end = film.chapters[idx + 1]?.start ?? v.duration
    setProgress(Math.min(1, (t - start) / (end - start)))
  }

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (!v.src) {
      v.src = film.src.hd
      setLoaded(true)
    }
    if (v.paused) {
      setUserPaused(false)
      v.play().catch(() => {})
    } else {
      setUserPaused(true)
      v.pause()
    }
  }

  const band = variant === "band"

  return (
    <section
      ref={rootRef}
      aria-labelledby={`${film.id}-heading`}
      style={
        {
          "--film-ground": film.palette.ground,
          "--film-accent": film.palette.accent,
          "--film-glow": film.palette.glow,
        } as React.CSSProperties
      }
      className={
        band
          ? "relative isolate overflow-hidden bg-[var(--film-ground)] text-white"
          : "mt-8 md:mt-10"
      }
    >
      <div
        className={
          band
            ? "relative mx-auto grid max-w-[1440px] items-center gap-8 px-6 py-12 md:grid-cols-[0.9fr_1.1fr] md:gap-12 md:py-20 lg:px-12"
            : "grid items-center gap-6 overflow-hidden rounded-large bg-[var(--film-ground)] p-5 text-white md:grid-cols-[1.1fr_0.9fr] md:gap-10 md:p-8"
        }
      >
        {/* Warm light behind the frame, echoing the film's lamplight. */}
        {band && (
          <span
            aria-hidden
            className="pointer-events-none absolute -right-40 top-1/2 -z-10 h-[40rem] w-[40rem] -translate-y-1/2 rounded-full opacity-40 blur-3xl"
            style={{ background: "radial-gradient(circle, var(--film-glow), transparent 65%)" }}
          />
        )}

        <div className={`flex flex-col gap-5 ${band ? "" : "md:order-2"}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--film-accent)]">
            {eyebrow}
          </p>
          <h2
            id={`${film.id}-heading`}
            className="font-display text-3xl leading-[1.05] md:text-[2.6rem] text-balance"
          >
            {headline}
          </h2>
          <p className="max-w-md text-[15px] leading-relaxed text-white/80">{body}</p>

          {/* The steps are a real sequence (the order the oil is made in),
              so they are numbered. The active one tracks the film. */}
          <ol className="flex flex-col gap-1.5">
            {film.chapters.map((c, i) => {
              const active = loaded && i === chapter
              const done = loaded && i < chapter
              return (
                <li
                  key={c.label}
                  className={`relative flex items-center gap-3 overflow-hidden rounded-rounded px-3 py-2 text-sm transition-colors duration-300 ${
                    active ? "bg-white/10 text-white" : done ? "text-white/80" : "text-white/55"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold tabular-nums transition-colors duration-300 ${
                      active || done ? "bg-[var(--film-accent)] text-[var(--film-ground)]" : "bg-white/15"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span className="font-semibold">{c.label}</span>
                  {active && (
                    <span
                      aria-hidden
                      className="absolute bottom-0 left-0 h-0.5 bg-[var(--film-accent)] transition-[width] duration-200 ease-linear"
                      style={{ width: `${progress * 100}%` }}
                    />
                  )}
                </li>
              )
            })}
          </ol>

          {cta && (
            <LocalizedClientLink
              href={cta.href}
              className="group/cta mt-1 inline-flex w-max items-center gap-2 rounded-rounded bg-[var(--film-accent)] px-5 py-3 text-sm font-semibold text-[var(--film-ground)] transition-transform hover:-translate-y-0.5"
            >
              {cta.label}
              <ArrowRight
                size={16}
                aria-hidden
                className="transition-transform group-hover/cta:translate-x-1"
              />
            </LocalizedClientLink>
          )}
        </div>

        {/* Film first on phones, so the steps never light up for a video
            that is still below the fold. */}
        <div className={`relative order-first ${band ? "md:order-none" : "md:order-1"}`}>
          <div className="relative aspect-video overflow-hidden rounded-large bg-black shadow-card-xl ring-1 ring-white/10">
            <video
              ref={videoRef}
              muted
              loop
              playsInline
              preload="none"
              poster={film.poster}
              aria-label={film.label}
              // A play() issued the moment `src` is set can be dropped while
              // the source is still loading; retry once it is playable.
              onCanPlay={(e) => {
                if (inView.current && !reduceMotion && !userPaused && e.currentTarget.paused) {
                  e.currentTarget.play().catch(() => {})
                }
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={onTime}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? "Pause film" : "Play film"}
              className={`absolute grid place-items-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--film-accent)] ${
                playing
                  ? "bottom-3 right-3 h-10 w-10"
                  : "left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2"
              }`}
            >
              {playing ? <Pause size={18} /> : <Play size={26} className="ml-1" />}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
