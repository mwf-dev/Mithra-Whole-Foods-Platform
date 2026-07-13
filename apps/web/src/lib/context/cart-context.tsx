"use client"

import {
  addToCart as addToCartAction,
  deleteLineItem as deleteLineItemAction,
  updateLineItem as updateLineItemAction,
} from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import {
  createContext,
  useCallback,
  useContext,
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

  const clearError = useCallback(() => setError(null), [])

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
        } catch (e: any) {
          setError(e?.message || "Couldn't add this item. Please try again.")
        }
      })
    },
    [applyOptimistic]
  )

  const updateItem = useCallback<CartContextValue["updateItem"]>(
    async ({ lineId, quantity }) => {
      setError(null)
      startTransition(async () => {
        applyOptimistic({ type: "update", lineId, quantity })
        try {
          await updateLineItemAction({ lineId, quantity })
        } catch (e: any) {
          setError(e?.message || "Couldn't update quantity. Please try again.")
        }
      })
    },
    [applyOptimistic]
  )

  const deleteItem = useCallback<CartContextValue["deleteItem"]>(
    async (lineId) => {
      setError(null)
      startTransition(async () => {
        applyOptimistic({ type: "delete", lineId })
        try {
          await deleteLineItemAction(lineId)
        } catch (e: any) {
          setError(e?.message || "Couldn't remove this item. Please try again.")
        }
      })
    },
    [applyOptimistic]
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
    </CartContext.Provider>
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
