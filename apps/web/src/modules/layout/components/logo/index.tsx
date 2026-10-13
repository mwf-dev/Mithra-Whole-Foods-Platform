import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * The official Mithra mark — the tree-and-face — rendered from the client's
 * vector logo (PRODUCTS/Logo/Logo.cdr (Colour).pdf) to a transparent PNG at
 * `public/brand/mithra-mark.png` (463×512). next/image serves a 1x/2x copy at
 * the displayed height.
 */
const MARK_SRC = "/brand/mithra-mark.png"
const MARK_RATIO = 463 / 512

/**
 * The client's own wordmark artwork, traced from their supplied image into
 * vector paths so it stays sharp at any size. "Mithra Whole Foods" is one
 * green; the Tamil motto "உணவே மருந்து" sits beneath it in brown as live text
 * (Noto Sans Tamil, `--font-tamil`) so it stays crisp and selectable.
 */
const WORDMARK = { src: "/brand/mithra-wordmark-name.svg", w: 336, h: 52.2 } as const

export const MOTTO = "உணவே மருந்து"

const SIZES = {
  header: {
    mark: "h-11 md:h-14 xl:h-[72px]",
    name: "h-[26px] sm:h-[32px] xl:h-[42px]",
    motto: "text-[10px] sm:text-[12px] xl:text-[16px]",
    gap: "gap-2 md:gap-3",
    // Largest rendered height in px. next/image builds its 1x/2x srcset from
    // this, so it must be the displayed size, not the source size.
    px: 72,
  },
  // Route-transition overlay: the dominant thing on screen.
  hero: {
    mark: "h-[clamp(3.5rem,10vw,6.5rem)]",
    name: "h-[clamp(2rem,6vw,3.6rem)]",
    motto: "text-[clamp(0.8rem,2.4vw,1.4rem)]",
    gap: "gap-3 md:gap-5",
    px: 104,
  },
} as const

/** Mark + wordmark, with the Tamil motto below the wordmark. */
export function BrandLockup({
  size = "header",
  priority = false,
}: {
  size?: keyof typeof SIZES
  priority?: boolean
}) {
  const s = SIZES[size]
  return (
    <span className={`flex items-center ${s.gap}`}>
      <Image
        src={MARK_SRC}
        alt=""
        width={Math.round(s.px * MARK_RATIO)}
        height={s.px}
        priority={priority}
        quality={75}
        className={`${s.mark} w-auto shrink-0 object-contain`}
      />
      <span className="flex flex-col items-center">
        <Image
          src={WORDMARK.src}
          alt=""
          width={WORDMARK.w}
          height={WORDMARK.h}
          priority={priority}
          unoptimized
          className={`${s.name} w-auto`}
        />
        <span
          lang="ta"
          className={`mt-0.5 font-tamil font-semibold leading-tight tracking-wide text-[#8B5A2B] ${s.motto}`}
        >
          {MOTTO}
        </span>
      </span>
    </span>
  )
}

/** Header logo: the lockup as a link home. */
export default function Logo({ className }: { className?: string }) {
  return (
    <LocalizedClientLink
      href="/"
      aria-label="Mithra Whole Foods — home"
      className={`flex shrink-0 items-center rounded-rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary ${
        className ?? ""
      }`}
      data-testid="nav-logo-link"
    >
      <BrandLockup priority />
    </LocalizedClientLink>
  )
}
