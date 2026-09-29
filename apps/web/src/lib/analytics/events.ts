/**
 * The commerce event catalogue — the single source of truth for what this
 * storefront reports and what each event carries.
 *
 * Typing the catalogue (rather than passing free-form strings around) is what
 * keeps a funnel usable six months in: a renamed property silently splits a
 * funnel in the analytics UI and nobody notices for weeks. Here it's a type
 * error.
 *
 * Naming: `object_verbed`, past tense, snake_case. Money is always minor units
 * (cents) plus an explicit `currency`, matching how Medusa returns totals — no
 * float dollars, ever.
 */

export type CommerceEventMap = {
  // ---- browsing -------------------------------------------------------
  product_viewed: {
    product_id: string
    product_handle?: string | null
    product_title: string
    variant_id?: string | null
    price?: number | null
    currency: string
    in_stock?: boolean
  }
  product_list_viewed: {
    list_type: "store" | "category" | "collection" | "search"
    item_count: number
    category_id?: string | null
    sort?: string | null
    page?: number
  }
  search_performed: {
    query: string
    result_count: number
  }
  /** Fired in addition to `search_performed` when the count is 0. The single
   * highest-value signal this store isn't collecting: it tells you what to
   * stock and what to alias in the backend synonym groups. */
  search_no_results: {
    query: string
  }

  // ---- cart -----------------------------------------------------------
  cart_item_added: {
    variant_id: string
    product_title?: string | null
    product_handle?: string | null
    quantity: number
    price?: number | null
    currency: string
    source: "pdp" | "product_card" | "buy_again"
  }
  cart_item_removed: {
    line_id: string
    variant_id?: string | null
    quantity: number
  }
  cart_quantity_changed: {
    line_id: string
    quantity: number
    previous_quantity?: number
  }
  /**
   * A cart mutation the backend rejected. Today this is shown as a toast and
   * then thrown away, so nobody finds out — including when the cause is the
   * site-wide `/store/*` rate limit. See docs/AUDIT_2026-08-01_FRONTEND_PERF.md.
   */
  cart_mutation_failed: {
    operation: "add" | "update" | "delete"
    variant_id?: string | null
    line_id?: string | null
    message: string
    status?: number | null
  }
  cart_viewed: {
    item_count: number
    subtotal?: number | null
    currency: string
  }

  // ---- checkout -------------------------------------------------------
  checkout_started: {
    cart_id: string
    item_count: number
    subtotal?: number | null
    currency: string
  }
  checkout_step_completed: {
    step: "address" | "delivery" | "payment"
    cart_id: string
  }
  shipping_option_selected: {
    cart_id: string
    option_id: string
    option_name?: string | null
    price?: number | null
    is_pickup: boolean
  }
  payment_method_selected: {
    cart_id: string
    provider_id: string
  }
  /**
   * Client-side confirmation only — good for funnel completion rate.
   * The authoritative revenue event is emitted server-side from the backend
   * `order-placed` subscriber, which survives ad blockers and the shopper
   * closing the tab. Deduplicate on `order_id` when reporting revenue.
   */
  order_completed: {
    order_id: string
    total?: number | null
    currency: string
    item_count: number
  }

  // ---- account --------------------------------------------------------
  wishlist_toggled: {
    product_handle: string
    saved: boolean
  }
  customer_signed_in: { customer_id: string }
  customer_registered: { customer_id: string }
}

export type CommerceEventName = keyof CommerceEventMap

/** A single event, discriminated by name — used by the sink implementations. */
export type CommerceEvent<K extends CommerceEventName = CommerceEventName> = {
  name: K
  properties: CommerceEventMap[K]
}
