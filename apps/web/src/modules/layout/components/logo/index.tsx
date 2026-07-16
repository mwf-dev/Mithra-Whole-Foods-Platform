"use client"

import { useState } from "react"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Brand logo, top-left of the header.
 *
 * Renders the artwork at `apps/web/public/logo.png`, falling back to a serif
 * wordmark + leaf mark (brand green) if that file is missing or fails to
 * decode. The artwork is emitted in the server HTML rather than probed for on
 * the client, so it paints with the header instead of popping in after
 * hydration; next/image downscales it to the size actually displayed.
 */
const LOGO_SRC = "/logo.png"
// The source art is ~1774×650; this is that ratio at its rendered height.
const LOGO_WIDTH = 153
const LOGO_HEIGHT = 56

export default function Logo({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false)

  return (
    <LocalizedClientLink
      href="/"
      aria-label="Mithra Whole Foods — home"
      className={`flex items-center gap-2.5 shrink-0 ${className ?? ""}`}
      data-testid="nav-logo-link"
    >
      {!failed ? (
        <Image
          src={LOGO_SRC}
          alt="Mithra Whole Foods"
          width={LOGO_WIDTH}
          height={LOGO_HEIGHT}
          priority
          quality={75}
          onError={() => setFailed(true)}
          className="h-14 w-auto object-contain"
        />
      ) : (
        <>
          <LeafMark className="h-9 w-9 text-[#2E5C31]" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[22px] leading-none text-[#2E5C31] tracking-tight">
              Mithra
            </span>
            <span className="text-[9px] font-semibold uppercase tracking-[0.22em] text-[#6b7f6e] mt-1">
              Whole Foods
            </span>
          </span>
        </>
      )}
    </LocalizedClientLink>
  )
}

/** Simple sprout/leaf mark echoing the brand's tree motif. */
function LeafMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M20 34V17"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M20 20C20 13 15 8 7 8c0 7 5 12 13 12Z"
        fill="currentColor"
        opacity="0.9"
      />
      <path
        d="M20 24c0-6 4.5-10.5 12-10.5C32 19.5 27.5 24 20 24Z"
        fill="currentColor"
        opacity="0.55"
      />
    </svg>
  )
}
