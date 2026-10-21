/**
 * Pre-launch switch. Until ordering opens, shoppers can browse and fill a cart
 * but cannot check out: the cart shows a notice instead of the checkout
 * button, /checkout renders the same notice, and `placeOrder` refuses.
 *
 * Open ordering by setting `NEXT_PUBLIC_ORDERS_OPEN=true` on the storefront
 * service and redeploying (NEXT_PUBLIC_ vars are inlined at build time).
 */
export const ORDERS_OPEN = process.env.NEXT_PUBLIC_ORDERS_OPEN === "true"

/** When ordering opens, as shoppers read it. */
export const ORDERS_OPEN_WHEN = "November"

export const LAUNCH_HEADLINE = "Opening soon"
export const LAUNCH_LINE = `Orders open in ${ORDERS_OPEN_WHEN}. Browse the store and fill your cart today.`
