"use client"

import { useEffect, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Brand logo, top-left of the header.
 *
 * Renders a serif wordmark + leaf mark (brand green) by default, and swaps to
 * the user-supplied artwork the moment it successfully decodes. Drop a real
 * image at `apps/web/public/logo.png` (or change `LOGO_SRC` to `logo.svg`) and
 * it appears automatically — no code change, and no broken-image flash while
 * the file is absent (a probe Image is used so we only show it once it loads).
 */
const LOGO_SRC = "/logo.png"

export default function Logo({ className }: { className?: string }) {
  const [logoSrc, setLogoSrc] = useState<string | null>(null)

  useEffect(() => {
    const probe = new window.Image()
    probe.onload = () => {
      // Guard against a non-image 200 (e.g. an HTML 404 page) decoding to 0×0.
      if (probe.naturalWidth > 0) setLogoSrc(LOGO_SRC)
    }
    probe.src = LOGO_SRC
  }, [])

  return (
    <LocalizedClientLink
      href="/"
      aria-label="Mithra Whole Foods — home"
      className={`flex items-center gap-2.5 shrink-0 ${className ?? ""}`}
      data-testid="nav-logo-link"
    >
      {logoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoSrc}
          alt="Mithra Whole Foods"
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
