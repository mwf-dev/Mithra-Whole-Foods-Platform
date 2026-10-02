import Image from "next/image"
import { BUSINESS } from "@lib/business"
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
  // menu button and cart on a 360px phone. The script runs small for its
  // font-size, hence the large numbers.
  header: {
    mark: "h-11 md:h-14 xl:h-[72px]",
    name: "text-[30px] sm:text-[36px] xl:text-[48px]",
    tag: "hidden xl:block text-[22px]",
    gap: "gap-2 md:gap-2.5",
    // Largest rendered height in px. next/image builds its 1x/2x srcset from
    // this, so it must be the displayed size, not the source size — otherwise
    // a 72px mark downloads the 1080px variant.
    px: 72,
  },
  // Route-transition overlay: the dominant thing on screen.
  hero: {
    mark: "h-[clamp(3.5rem,10vw,6.5rem)]",
    name: "text-[clamp(2.2rem,7vw,4.6rem)]",
    tag: "text-[clamp(1.2rem,3.4vw,2.2rem)]",
    gap: "gap-3 md:gap-5",
    px: 104,
  },
} as const

/**
 * Mark + wordmark lockup. The full name — "Mithra Whole Foods" — is one line
 * at one size, in the calligraphic hand of the client's signage and business
 * card (Tangerine, the closest free match). "Mithra" keeps the bark brown of
 * the mark's trunk and "Whole Foods" the brand green. The sign's tagline,
 * "Harvesting Goodness", sits under it, right-aligned as on the card. Live
 * text, so it stays sharp at any size.
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
      <span className="flex flex-col whitespace-nowrap font-brand font-bold leading-none">
        <span className={`leading-[0.8] ${s.name}`}>
          <span className="text-bark">Mithra</span>{" "}
          <span className="text-primary">Whole Foods</span>
        </span>
        <span className={`-mt-1 self-end text-primary/80 ${s.tag}`}>
          {BUSINESS.tagline}
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
