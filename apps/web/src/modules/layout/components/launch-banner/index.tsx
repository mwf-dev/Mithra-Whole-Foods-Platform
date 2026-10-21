import { LAUNCH_HEADLINE, LAUNCH_LINE, ORDERS_OPEN } from "@lib/launch"

/**
 * Always-on pre-launch strip above the announcement ticker. Not dismissible on
 * purpose: shoppers must know they cannot order yet before they fill a cart.
 * Disappears by itself once ordering opens (see `@lib/launch`).
 */
export default function LaunchBanner() {
  if (ORDERS_OPEN) {
    return null
  }

  return (
    <div
      role="status"
      className="bg-terracotta text-white text-center text-sm px-4 py-2.5"
    >
      <span className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.08em] text-xs">
        <span aria-hidden className="h-2 w-2 rounded-full bg-white animate-pulse" />
        {LAUNCH_HEADLINE}
      </span>
      <span className="mx-2 text-white/60" aria-hidden>
        ·
      </span>
      <span>{LAUNCH_LINE}</span>
    </div>
  )
}
