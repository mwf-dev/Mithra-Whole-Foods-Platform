import { readCartMergeNotice } from "@lib/data/cookies"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cart",
  description: "View your cart",
}

/**
 * The cart page renders entirely from client context.
 *
 * It used to `await retrieveCart()` and `await retrieveCustomer()` here, which
 * meant clicking "Cart" paid two backend round trips — through Vercel, to
 * Railway, to a database on another continent — for data the browser already
 * had. The `(main)` layout resolves both and hands them to `CartProvider` /
 * `CustomerProvider`, and layouts do not re-render on client-side navigation,
 * so that state is still in memory when the shopper arrives here.
 *
 * What is left is a cookie read, which is local to the Next server and costs
 * nothing. Keeping the route as a server component (rather than making the
 * whole thing client-side) preserves the metadata above and lets the merge
 * notice stay server-resolved.
 *
 * Consequence worth knowing: this page no longer re-validates the cart against
 * Medusa on arrival. It does not need to — every mutation adopts the
 * authoritative cart returned by the server action, so the context is already
 * the post-mutation truth. Checkout re-reads the cart server-side before taking
 * money, which is where that guarantee actually has to hold.
 */
export default async function Cart() {
  const mergedIn = await readCartMergeNotice()

  return <CartTemplate mergedIn={mergedIn} />
}
