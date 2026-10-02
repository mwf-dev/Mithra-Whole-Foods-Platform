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

const SIZES = {
  // Header: left-aligned, one line, sized so the full name fits beside the
  // menu button and cart on a 360px phone.
  header: {
    mark: "h-11 md:h-14 xl:h-[72px]",
    name: "text-[18px] sm:text-[22px] xl:text-[30px]",
    gap: "gap-2 md:gap-2.5",
    // Largest rendered height in px. next/image builds its 1x/2x srcset from
    // this, so it must be the displayed size, not the source size — otherwise
    // a 72px mark downloads the 1080px variant.
    px: 72,
  },
  // Route-transition overlay: the dominant thing on screen.
  hero: {
    mark: "h-[clamp(3.5rem,10vw,6.5rem)]",
    name: "text-[clamp(1.4rem,4.6vw,3rem)]",
    gap: "gap-3 md:gap-5",
    px: 104,
  },
} as const

/**
 * Mark + wordmark lockup. The full name — "MITHRA WHOLE FOODS" — is one line
 * at one size (the client asked for the words to read as a single name, not
 * a big "Mithra" over a small tagline). "Mithra" keeps the bark brown of the
 * mark's trunk and "Whole Foods" the brand green, so the pack colours carry
 * over. Live text, so it stays sharp at any size and costs no extra image.
 */
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
      <span
        className={`whitespace-nowrap font-display uppercase leading-none tracking-[0.04em] ${s.name}`}
      >
        <span className="text-bark">Mithra</span>{" "}
        <span className="text-primary">Whole Foods</span>
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
