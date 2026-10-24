import { runManualFulfillment } from "../../../../../lib/manual-fulfillment"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { createOrderFulfillmentWorkflow } from "@medusajs/medusa/core-flows"
import { missingForShipping, paymentState, remainingItems, activeFulfillments } from "../../../../../lib/ship-orders"
import { appendEvent, type DeliveryMethod } from "../../../../../lib/tracking-events"
import { EasyshipFulfillmentService } from "../../../../../modules/fulfillment-easyship/services/easyship-fulfillment"
import { loadOrder, providerByOption, toRow } from "../../_shared"

/**
 * POST /admin/ship-orders/:id/fulfill
 * Body: { method?: "courier" | "manual", driver?, note? }
 *
 * Packs whatever is still unfulfilled, by the method staff pick for THIS order
 * (the shopper never chooses; that is the store's call after the order lands):
 *   - courier: buys an Easyship label (tracking number + label PDF). If the
 *     shopper's shipping option is already an Easyship one, Medusa's provider
 *     buys it; otherwise we buy it here and attach it when marking shipped.
 *   - manual: no carrier. Records who is delivering and a note; staff mark it
 *     out for delivery and delivered by hand.
 * Omitted `method` falls back to what the shipping option implies.
 *
 * Refuses (409) when payment hasn't completed or the address is incomplete, so
 * a label is never bought for an order that can't be delivered or paid for.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const body = (req.body ?? {}) as { method?: string; driver?: string; note?: string }
  const order = await loadOrder(req.scope, req.params.id)
  if (!order || order.canceled_at) return res.status(404).json({ message: "Order not found" })

  const items = remainingItems(order.items, order.fulfillments)
  if (!items.length) return res.status(409).json({ message: "Nothing left to pack on this order." })

  const missing = missingForShipping(order.shipping_address, order.email)
  if (missing.length) {
    return res.status(409).json({ message: `Can't ship yet: missing ${missing.join(", ")}.` })
  }
  if (paymentState(order.payment_collections) === "unpaid") {
    return res.status(409).json({ message: "Can't ship yet: payment hasn't completed." })
  }

  const providers = await providerByOption(req.scope, [order])
  const optionProvider = order.shipping_methods?.[0]?.shipping_option_id
    ? providers.get(order.shipping_methods[0].shipping_option_id)
    : undefined
  const optionIsEasyship = optionProvider?.startsWith("easyship") ?? false

  if (body.method !== undefined && body.method !== "courier" && body.method !== "manual") {
    return res.status(400).json({ message: "method must be 'courier' or 'manual'." })
  }
  const method: DeliveryMethod = (body.method as DeliveryMethod) ?? (optionIsEasyship ? "courier" : "manual")

  // Cash on delivery needs someone to collect the cash; a courier parcel can't.
  // Set ALLOW_COD_COURIER=true if the courier account supports COD collection.
  if (
    method === "courier" &&
    paymentState(order.payment_collections) === "cod" &&
    process.env.ALLOW_COD_COURIER !== "true"
  ) {
    return res.status(409).json({
      message: "This is a pay-on-delivery order. It can only go by manual delivery, so the driver can collect the cash.",
    })
  }

  const driver = typeof body.driver === "string" ? body.driver.trim().slice(0, 80) : ""
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : ""

  // Courier on a non-Easyship option: buy the label first so a rejected address
  // fails before anything is packed.
  let bought: { data: Record<string, any>; labels: any[] } | null = null
  if (method === "courier" && !optionIsEasyship) {
    try {
      const service = new EasyshipFulfillmentService(
        {},
        {
          apiKey: process.env.EASYSHIP_API_KEY,
          shipFromZip: process.env.SHIP_FROM_ZIP || "19341",
          shipFromCity: process.env.SHIP_FROM_CITY || "Exton",
          shipFromState: process.env.SHIP_FROM_STATE || "PA",
          shipFromCountry: process.env.SHIP_FROM_COUNTRY || "US",
          shipFromAddress: process.env.SHIP_FROM_ADDRESS || "Mithra Whole Foods",
        } as any
      )
      const lines = items.map((i) => {
        const li = order.items.find((x: any) => x.id === i.id)
        return { title: li?.product_title || li?.title, unit_price: li?.unit_price, quantity: i.quantity }
      })
      bought = (await service.createFulfillment({}, lines, order, null)) as any
    } catch (e: any) {
      return res.status(502).json({ message: e?.message || "Could not buy the shipping label." })
    }
  }

  const before = new Set(activeFulfillments(order.fulfillments).map((f: any) => f.id))

  try {
    const run = () =>
      createOrderFulfillmentWorkflow(req.scope).run({
        input: { order_id: order.id, items, no_notification: true } as any,
      })
    // Manual delivery must never reach the courier's label purchase.
    await (method === "manual" ? runManualFulfillment(run) : run())
  } catch (e: any) {
    if (bought?.data?.easyship_shipment_id) {
      // Don't leave a paid label behind for a parcel that was never packed.
      await new EasyshipFulfillmentService({}, { apiKey: process.env.EASYSHIP_API_KEY } as any)
        .cancelFulfillment(bought.data)
        .catch(() => undefined)
    }
    // Surface the provider's own message (e.g. Easyship rejecting an address).
    return res.status(502).json({ message: e?.message || "Could not create the shipment." })
  }

  // Record the method on the new fulfillment (and park a bought label for the ship step).
  const fresh = await loadOrder(req.scope, order.id)
  const created = activeFulfillments(fresh.fulfillments).filter((f: any) => !before.has(f.id))
  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT)
  for (const f of created as any[]) {
    let metadata: Record<string, unknown> = { ...(f.metadata ?? {}), delivery_method: method }
    if (driver) metadata.driver = driver
    if (note) metadata.note = note
    if (method === "courier") {
      metadata = appendEvent(metadata, { status: "label_created", at: new Date().toISOString(), source: "admin" }).metadata
    }
    const update: Record<string, unknown> = { metadata }
    if (bought) update.data = { ...(f.data ?? {}), ...bought.data }
    await fulfillmentModule.updateFulfillment(f.id, update as any)
  }

  const after = await loadOrder(req.scope, order.id)
  res.json({ order: toRow(after, await providerByOption(req.scope, [after])) })
}
