import { ORDERS_OPEN_WHEN } from "@lib/launch"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Stands in for the checkout button (and the checkout page) before ordering
 * opens. The cart is kept, so shoppers can come back and order in one tap.
 */
export default function OrdersClosedNotice({
  showShopLink = false,
}: {
  showShopLink?: boolean
}) {
  return (
    <div
      role="status"
      data-testid="orders-closed-notice"
      className="rounded-xl border border-terracotta/30 bg-beige p-5 text-center"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.08em] text-terracotta">
        Opening soon
      </p>
      <p className="mt-1 text-lg font-semibold text-charcoal">
        You can place your order from {ORDERS_OPEN_WHEN}
      </p>
      <p className="mt-1 text-sm text-grey-60">
        We are not taking orders yet. Your cart is saved, so you can check out
        as soon as we open.
      </p>
      {showShopLink && (
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <LocalizedClientLink
            href="/cart"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Back to cart
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/store"
            className="rounded-full border border-primary px-5 py-2 text-sm font-semibold text-primary hover:bg-primary/5"
          >
            Keep browsing
          </LocalizedClientLink>
        </div>
      )}
    </div>
  )
}
