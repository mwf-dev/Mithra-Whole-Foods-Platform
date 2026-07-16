"use client"

import {
  addToCart as addToCartAction,
  deleteLineItem as deleteLineItemAction,
  updateLineItem as updateLineItemAction,
} from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { useRouter } from "next/navigation"
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
 * it. Server actions revalidate the `carts` cache tag, so once the request
 * resolves Next.js streams a fresh RSC payload and `initialCart` is replaced
 * with the authoritative cart — React's `useOptimistic` then drops the
 * optimistic diff automatically.
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
  const [cart, applyOptimistic] = useOptimistic(initialCart, cartReducer)
  const router = useRouter()
  const clearError = useCallback(() => setError(null), [])

  /**
   * `revalidateTag` in the server action only invalidates the *server* fetch
   * cache for the route that was active when the action was dispatched. If the
   * shopper navigates while the request is in flight — add an item, immediately
   * hit "Go to cart" — the destination's RSC payload is fetched mid-race and
   * lands in the client router cache holding the pre-mutation cart. Nothing
   * evicts it (`initialCart` comes from the layout, which does not re-render on
   * client-side navigation), so the item stays invisible until a manual reload.
   *
   * `router.refresh()` clears the whole client router cache, which is what
   * actually fixes it. It must be unconditional: gating it on "did the route
   * change?" does not work, because the action typically resolves *before* the
   * navigation commits, so the route still reads as the old one.
   *
   * Cost is one extra RSC payload per mutation, fetched in the background — the
   * optimistic UI has already updated, so no one waits on it.
   */
  const refreshAfterMutation = useCallback(() => router.refresh(), [router])

  const addItem = useCallback<CartContextValue["addItem"]>(
    async ({ variantId, quantity, countryCode, seed }) => {
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
          await addToCartAction({ variantId, quantity, countryCode })
          refreshAfterMutation()
        } catch (e: any) {
          setError(e?.message || "Couldn't add this item. Please try again.")
        }
      })
    },
    [applyOptimistic, refreshAfterMutation]
  )

  const updateItem = useCallback<CartContextValue["updateItem"]>(
    async ({ lineId, quantity }) => {
      setError(null)
      startTransition(async () => {
        applyOptimistic({ type: "update", lineId, quantity })
        try {
          await updateLineItemAction({ lineId, quantity })
          refreshAfterMutation()
        } catch (e: any) {
          setError(e?.message || "Couldn't update quantity. Please try again.")
        }
      })
    },
    [applyOptimistic, refreshAfterMutation]
  )

  const deleteItem = useCallback<CartContextValue["deleteItem"]>(
    async (lineId) => {
      setError(null)
      startTransition(async () => {
        applyOptimistic({ type: "delete", lineId })
        try {
          await deleteLineItemAction(lineId)
          refreshAfterMutation()
        } catch (e: any) {
          setError(e?.message || "Couldn't remove this item. Please try again.")
        }
      })
    },
    [applyOptimistic, refreshAfterMutation]
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
