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
  // Header: centred, big enough to read at a glance on a phone.
  header: {
    mark: "h-12 md:h-[68px]",
    name: "text-[24px] md:text-[36px]",
    tag: "text-[8.5px] md:text-[11.5px]",
    gap: "gap-2 md:gap-3",
    // Largest rendered height in px. next/image builds its 1x/2x srcset from
    // this, so it must be the displayed size, not the source size — otherwise
    // a 60px mark downloads the 1080px variant.
    px: 68,
  },
  // Route-transition overlay: the dominant thing on screen.
  hero: {
    mark: "h-[clamp(5rem,14vw,8.5rem)]",
    name: "text-[clamp(2.4rem,7vw,4.25rem)]",
    tag: "text-[clamp(0.7rem,1.6vw,1rem)]",
    gap: "gap-4 md:gap-6",
    px: 136,
  },
} as const

/**
 * Mark + wordmark lockup. "MITHRA" is set in the bark brown of the mark's
 * trunk, "WHOLE FOODS" in brand green between two leaf rules — the same
 * arrangement as the printed packs, but live text, so it stays sharp at any
 * size and costs no extra image.
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
      <span className="flex flex-col items-center leading-none">
        <span
          className={`font-display uppercase tracking-[0.06em] text-bark leading-[0.9] ${s.name}`}
        >
          Mithra
        </span>
        <span
          className={`mt-1 flex items-center gap-1.5 font-semibold uppercase tracking-[0.3em] text-primary ${s.tag}`}
        >
          <span aria-hidden className="h-px w-3 bg-current opacity-60 md:w-4" />
          Whole Foods
          <span aria-hidden className="h-px w-3 bg-current opacity-60 md:w-4" />
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
