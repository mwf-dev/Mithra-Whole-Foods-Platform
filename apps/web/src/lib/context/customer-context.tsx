"use client"

import { HttpTypes } from "@medusajs/types"
import { createContext, useContext } from "react"

/**
 * The signed-in customer, resolved once by the `(main)` layout and shared with
 * every client component below it.
 *
 * Exists for the same reason as the cart context: layouts do not re-render on
 * client-side navigation, so a value fetched there is already in memory when
 * the shopper moves between pages. Pages that re-fetched the customer for
 * themselves were paying a backend round trip for something the browser had —
 * `/cart` was doing exactly that, and it is on the hot path.
 *
 * Read-only on purpose. Login and logout change the customer, and both are
 * full server round trips that re-run the layout anyway, so there is no client
 * mutation path to model here.
 */

type Customer = HttpTypes.StoreCustomer | null

const CustomerContext = createContext<Customer>(null)

export function CustomerProvider({
  customer,
  children,
}: {
  customer: Customer
  children: React.ReactNode
}) {
  return (
    <CustomerContext.Provider value={customer}>
      {children}
    </CustomerContext.Provider>
  )
}

/**
 * The current customer, or `null` for a guest.
 *
 * Also returns `null` outside the provider (e.g. the checkout layout, which
 * does not mount it) — callers that need to tell "guest" from "not available"
 * should take the customer as a prop instead.
 */
export function useCustomer(): Customer {
  return useContext(CustomerContext)
}
