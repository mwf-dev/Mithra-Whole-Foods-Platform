"use client"

import {
  addToCart as addToCartAction,
  deleteLineItem as deleteLineItemAction,
  updateLineItem as updateLineItemAction,
} from "@lib/data/cart"
import { track } from "@lib/analytics/client"
import { messageOf, reportError, statusOf } from "@lib/observability/report"
import { HttpTypes } from "@medusajs/types"
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useOptimistic,
  useState,
  useTransition,
} from "react"

/**
 * Optimistic cart context.
 *
 * The whole point: the UI reacts in milliseconds. Every mutation is applied to
 * a local optimistic copy of the cart *first* (so the nav badge, dropdown and
 * cart page update instantly), then the real Medusa server action runs behind
 * it. The action returns the authoritative cart, which is adopted as the new
 * base state — React's `useOptimistic` then drops the optimistic diff
 * automatically.
 *
 * This context is the single source of truth for the cart on the client. Any
 * surface that shows cart contents should read `useCart()` rather than take a
 * server prop, so that navigating to it costs nothing.
 *
 * If the backend rejects the mutation, the optimistic state is discarded when
 * the transition ends (reverting the UI) and `error` is surfaced so the caller
 * can show a message. This is the classic "assume success, reconcile on
 * response, roll back on failure" pattern.
 */

type LineItem = HttpTypes.StoreCartLineItem
type Cart = HttpTypes.StoreCart

/** Display fields a caller can hand us so an added row renders before the
 * server round-trip completes. Everything is optional — at minimum the nav
 * badge count still bumps instantly from `quantity`. */
export type OptimisticLineItemSeed = {
  title?: string
  product_title?: string
  product_handle?: string
  thumbnail?: string | null
  unit_price?: number
  variant?: LineItem["variant"]
}

type OptimisticAction =
  | { type: "add"; item: LineItem }
  | { type: "update"; lineId: string; quantity: number }
  | { type: "delete"; lineId: string }

function cartReducer(cart: Cart | null, action: OptimisticAction): Cart | null {
  // No server cart yet (first-ever add): render a minimal shell so the badge
  // and dropdown have something to show until the real cart comes back.
  if (!cart) {
    if (action.type === "add") {
      return { items: [action.item] } as unknown as Cart
    }
    return cart
  }

  const items = cart.items ? [...cart.items] : []

  switch (action.type) {
    case "add": {
      const idx = items.findIndex(
        (i) => i.variant_id && i.variant_id === action.item.variant_id
      )
      if (idx >= 0) {
        const merged = {
          ...items[idx],
          quantity: items[idx].quantity + action.item.quantity,
        }
        const next = [...items]
        next[idx] = merged
        return { ...cart, items: next }
      }
      return { ...cart, items: [...items, action.item] }
    }
    case "update": {
      return {
        ...cart,
        items: items.map((i) =>
          i.id === action.lineId ? { ...i, quantity: action.quantity } : i
        ),
      }
    }
    case "delete": {
      return { ...cart, items: items.filter((i) => i.id !== action.lineId) }
    }
    default:
      return cart
  }
}

type CartContextValue = {
  /** The optimistic cart — read this everywhere instead of a server prop. */
  cart: Cart | null
  /** True while any mutation's server round-trip is in flight. */
  isPending: boolean
  /** Last mutation error message, or null. */
  error: string | null
  clearError: () => void
  addItem: (input: {
    variantId: string
    quantity: number
    countryCode: string
    seed?: OptimisticLineItemSeed
    /** Which surface the add came from — lets the funnel compare PDP
     * conversion against quick-add on product cards. */
    source?: "pdp" | "product_card" | "buy_again"
  }) => Promise<void>
  updateItem: (input: { lineId: string; quantity: number }) => Promise<void>
  deleteItem: (lineId: string) => Promise<void>
}

const CartContext = createContext<CartContextValue | null>(null)

export function CartProvider({
  initialCart,
  children,
}: {
  initialCart: Cart | null
  children: React.ReactNode
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  /**
   * The client owns the cart.
   *
   * This used to read `initialCart` (a layout prop) directly and call
   * `router.refresh()` after every mutation to pull the new value back. That
   * worked, but `router.refresh()` wipes the *entire* client Router Cache —
   * every prefetched route with it — and re-runs the `(main)` layout, which
   * costs 4-5 backend calls. It was roughly 6.5 `/store/*` requests per
   * add-to-cart, and it is why clicking "Cart" right after adding an item paid
   * a full server round trip instead of rendering from data the browser
   * already had.
   *
   * Instead the mutation actions now return Medusa's authoritative cart (it was
   * always in the response, just discarded), and we adopt it here. No route
   * refetch, no cache eviction, so prefetches survive and navigation is local.
   */
  const [serverCart, setServerCart] = useState<Cart | null>(initialCart)

  /**
   * A full page load (or any navigation that re-runs the layout) produces a
   * fresh `initialCart`. Adopt it — but only when it is genuinely a different
   * cart, otherwise this would clobber a newer cart we just got back from a
   * mutation with a staler server render.
   */
  useEffect(() => {
    setServerCart((current) => {
      if (!initialCart) return current === null ? current : initialCart
      if (!current) return initialCart
      return initialCart.id !== current.id ? initialCart : current
    })
  }, [initialCart])

  const [cart, applyOptimistic] = useOptimistic(serverCart, cartReducer)
  const clearError = useCallback(() => setError(null), [])

  const currency = cart?.currency_code ?? "usd"

  /**
   * A cart mutation the backend rejected.
   *
   * The optimistic change has already rolled back and the shopper gets a
   * toast — but until now that was the end of it: the failure was never
   * recorded anywhere. That mattered because the most likely cause is the
   * site-wide `/store/*` rate limit (see
   * `docs/AUDIT_2026-08-01_FRONTEND_PERF.md` §1), which is invisible from the
   * outside and looks to the shopper like the cart is broken.
   *
   * Reported twice on purpose: to analytics so it shows up as funnel drop-off,
   * and to error tracking so someone gets paged.
   */
  const reportMutationFailure = useCallback(
    (
      operation: "add" | "update" | "delete",
      error: unknown,
      ids: { variantId?: string; lineId?: string }
    ) => {
      const message = messageOf(error)
      const status = statusOf(error)

      track("cart_mutation_failed", {
        operation,
        variant_id: ids.variantId ?? null,
        line_id: ids.lineId ?? null,
        message,
        status,
      })

      reportError(error, {
        scope: `cart.${operation}`,
        extra: { ...ids, status },
      })

      return message
    },
    []
  )

  const addItem = useCallback<CartContextValue["addItem"]>(
    async ({ variantId, quantity, countryCode, seed, source = "pdp" }) => {
      setError(null)
      const optimisticItem = {
        id: `optimistic-${variantId}-${Date.now()}`,
        variant_id: variantId,
        quantity,
        title: seed?.title,
        product_title: seed?.product_title,
        product_handle: seed?.product_handle,
        thumbnail: seed?.thumbnail ?? null,
        unit_price: seed?.unit_price ?? 0,
        total: (seed?.unit_price ?? 0) * quantity,
        variant: seed?.variant,
      } as unknown as LineItem

      startTransition(async () => {
        applyOptimistic({ type: "add", item: optimisticItem })
        try {
          const updated = await addToCartAction({
            variantId,
            quantity,
            countryCode,
          })
          if (updated) setServerCart(updated)
          track("cart_item_added", {
            variant_id: variantId,
            product_title: seed?.product_title ?? seed?.title ?? null,
            product_handle: seed?.product_handle ?? null,
            quantity,
            price: seed?.unit_price ?? null,
            currency,
            source,
          })
        } catch (e: any) {
          const message = reportMutationFailure("add", e, { variantId })
          setError(message || "Couldn't add this item. Please try again.")
        }
      })
    },
    [applyOptimistic, reportMutationFailure, currency]
  )

  const updateItem = useCallback<CartContextValue["updateItem"]>(
    async ({ lineId, quantity }) => {
      setError(null)
      const previousQuantity = cart?.items?.find(
        (i) => i.id === lineId
      )?.quantity

      startTransition(async () => {
        applyOptimistic({ type: "update", lineId, quantity })
        try {
          const updated = await updateLineItemAction({ lineId, quantity })
          if (updated) setServerCart(updated)
          track("cart_quantity_changed", {
            line_id: lineId,
            quantity,
            previous_quantity: previousQuantity,
          })
        } catch (e: any) {
          const message = reportMutationFailure("update", e, { lineId })
          setError(message || "Couldn't update quantity. Please try again.")
        }
      })
    },
    [
      applyOptimistic,
      reportMutationFailure,
      cart?.items,
    ]
  )

  const deleteItem = useCallback<CartContextValue["deleteItem"]>(
    async (lineId) => {
      setError(null)
      const removed = cart?.items?.find((i) => i.id === lineId)

      startTransition(async () => {
        applyOptimistic({ type: "delete", lineId })
        try {
          const updated = await deleteLineItemAction(lineId)
          if (updated) setServerCart(updated)
          track("cart_item_removed", {
            line_id: lineId,
            variant_id: removed?.variant_id ?? null,
            quantity: removed?.quantity ?? 0,
          })
        } catch (e: any) {
          const message = reportMutationFailure("delete", e, { lineId })
          setError(message || "Couldn't remove this item. Please try again.")
        }
      })
    },
    [
      applyOptimistic,
      reportMutationFailure,
      cart?.items,
    ]
  )

  return (
    <CartContext.Provider
      value={{
        cart,
        isPending,
        error,
        clearError,
        addItem,
        updateItem,
        deleteItem,
      }}
    >
      {children}
      <CartErrorToast error={error} onDismiss={clearError} />
    </CartContext.Provider>
  )
}
// Force HMR recompile


/**
 * App-wide toast for a failed cart mutation. When an optimistic add/update/
 * delete is rejected by the backend, the optimistic change has already rolled
 * back — this tells the shopper why. Auto-dismisses after a few seconds.
 */
function CartErrorToast({
  error,
  onDismiss,
}: {
  error: string | null
  onDismiss: () => void
}) {
  useEffect(() => {
    if (!error) return
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [error, onDismiss])

  if (!error) return null

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4 pointer-events-none"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-lg bg-red-600 px-4 py-3 text-sm text-white shadow-lg max-w-md">
        <span className="flex-1">{error}</span>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded px-1 text-white/80 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  )
}

/**
 * Access the optimistic cart. Components that may render outside the provider
 * (e.g. the checkout layout, which doesn't mount it) should use
 * {@link useCartOptional} instead.
 */
export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider")
  }
  return ctx
}

/** Like {@link useCart} but returns null outside the provider instead of throwing. */
export function useCartOptional(): CartContextValue | null {
  return useContext(CartContext)
}
