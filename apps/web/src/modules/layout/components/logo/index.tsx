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
 * The client's own wordmark artwork ("Mithra" green, "Whole Foods" brown,
 * "— Harvesting Goodness —"), traced from their supplied image into vector
 * paths so it stays sharp at any size. `name` is the same artwork without the
 * tagline, for small screens where the tagline would be unreadable.
 */
const WORDMARK = {
  full: { src: "/brand/mithra-wordmark.svg", w: 336, h: 83.4 },
  name: { src: "/brand/mithra-wordmark-name.svg", w: 336, h: 52.2 },
} as const

const SIZES = {
  // Header: name only up to xl (fits beside the menu and cart on a 360px
  // phone), the full lockup with the tagline from xl.
  header: {
    mark: "h-11 md:h-14 xl:h-[72px]",
    name: "h-[30px] sm:h-[36px] xl:hidden",
    full: "hidden xl:block xl:h-[66px]",
    gap: "gap-2 md:gap-3",
    // Largest rendered height in px. next/image builds its 1x/2x srcset from
    // this, so it must be the displayed size, not the source size — otherwise
    // a 72px mark downloads the 1080px variant.
    px: 72,
  },
  // Route-transition overlay: the dominant thing on screen.
  hero: {
    mark: "h-[clamp(3.5rem,10vw,6.5rem)]",
    name: "",
    full: "h-[clamp(4.5rem,13vw,8rem)]",
    gap: "gap-3 md:gap-5",
    px: 104,
  },
} as const

/** Mark + the client's wordmark artwork. */
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
      {s.name && (
        <Image
          src={WORDMARK.name.src}
          alt=""
          width={WORDMARK.name.w}
          height={WORDMARK.name.h}
          priority={priority}
          unoptimized
          className={`${s.name} w-auto`}
        />
      )}
      <Image
        src={WORDMARK.full.src}
        alt=""
        width={WORDMARK.full.w}
        height={WORDMARK.full.h}
        priority={priority}
        unoptimized
        className={`${s.full} w-auto`}
      />
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
