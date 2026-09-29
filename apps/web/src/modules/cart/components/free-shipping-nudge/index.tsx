"use client"

import { convertToLocale } from "@lib/util/money"

// Matches the "Free delivery on orders above $49" announcement bar.
const FREE_SHIPPING_THRESHOLD = 49

export default function FreeShippingNudge({
  cart,
}: {
  cart: { item_subtotal?: number | null; currency_code?: string | null }
}) {
  const subtotal = cart?.item_subtotal ?? 0
  const currency_code = cart?.currency_code ?? "usd"
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal
  const pct = Math.min(
    100,
    Math.max(0, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100))
  )
  const unlocked = remaining <= 0

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
      <p className="text-sm text-charcoal mb-2">
        {unlocked ? (
          <span className="font-semibold text-primary">
            🎉 You’ve unlocked free delivery!
          </span>
        ) : (
          <>
            Add{" "}
            <span className="font-semibold text-primary">
              {convertToLocale({ amount: remaining, currency_code })}
            </span>{" "}
            more for <span className="font-semibold">free delivery</span>
          </>
        )}
      </p>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-primary/10"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
