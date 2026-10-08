"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"

export type TrackedOrder = {
  number: string
  placed_at: string
  status: "received" | "packed" | "shipped" | "delivered" | "canceled"
  ship_to: string
  items: { title: string; quantity: number }[]
  fulfillments: {
    packed_at: string | null
    shipped_at: string | null
    delivered_at: string | null
    tracking: { number: string; url: string | null }[]
  }[]
}

/** Guest-friendly lookup: order number + the phone used at checkout. */
export async function lookupOrder(
  _state: unknown,
  formData: FormData
): Promise<{ order?: TrackedOrder; error?: string } | null> {
  const order = String(formData.get("order") ?? "").trim()
  const phone = String(formData.get("phone") ?? "").trim()
  if (!order || !phone) {
    return { error: "Enter your order number and the phone number you used at checkout." }
  }
  try {
    const res = await sdk.client.fetch<{ order: TrackedOrder }>(
      "/store/order-lookup",
      { method: "POST", body: { order, phone } }
    )
    return { order: res.order }
  } catch (e: any) {
    const status = e?.status ?? e?.response?.status
    if (status === 429) {
      return { error: "Too many attempts. Please wait a few minutes and try again." }
    }
    if (status === 404) {
      return { error: "We couldn't find an order matching those details. Check the order number and phone." }
    }
    return { error: "Something went wrong looking up your order. Please try again." }
  }
}

export const retrieveOrder = async (id: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderResponse>(`/store/orders/${id}`, {
      method: "GET",
      query: {
        fields:
          "*payment_collections.payments,*items,*items.metadata,*items.variant,*items.product",
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ order }) => order)
    .catch((err) => medusaError(err))
}

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, any>
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderListResponse>(`/store/orders`, {
      method: "GET",
      query: {
        limit,
        offset,
        order: "-created_at",
        fields: "*items,+items.metadata,*items.variant,*items.product",
        ...filters,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
}

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err) => ({ success: false, error: err.message, order: null }))
}
