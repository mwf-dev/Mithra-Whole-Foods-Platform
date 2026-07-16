"use client"

import { useCart } from "@lib/context/cart-context"
import CartDropdown from "../cart-dropdown"

/**
 * Reads the optimistic cart from context so the nav badge and dropdown update
 * the instant an item is added/removed — before the Medusa round-trip returns.
 * The provider is seeded server-side with the real cart, so the first paint is
 * still correct with no client fetch.
 */
export default function CartButton() {
  const { cart } = useCart()

  return <CartDropdown cart={cart} />
}
