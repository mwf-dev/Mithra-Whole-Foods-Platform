"use server"

import { retrieveCustomer, updateCustomer } from "./customer"

export type WishlistResult =
  | { needsAuth: true }
  | { needsAuth: false; saved: boolean }

/** Read the signed-in customer's saved product handles (empty for guests). */
export async function getWishlist(): Promise<string[]> {
  const customer = await retrieveCustomer().catch(() => null)
  return (customer?.metadata?.wishlist as string[] | undefined) ?? []
}

/**
 * Toggle a product in the signed-in customer's wishlist (persisted on the
 * customer's metadata). Guests get `{ needsAuth: true }` so the caller can send
 * them to sign in / sign up — favouriting requires an account.
 */
export async function toggleWishlist(handle: string): Promise<WishlistResult> {
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    return { needsAuth: true }
  }

  const current = (customer.metadata?.wishlist as string[] | undefined) ?? []
  const next = current.includes(handle)
    ? current.filter((h) => h !== handle)
    : [...current, handle]

  await updateCustomer({
    metadata: { ...(customer.metadata ?? {}), wishlist: next },
  })

  return { needsAuth: false, saved: next.includes(handle) }
}
