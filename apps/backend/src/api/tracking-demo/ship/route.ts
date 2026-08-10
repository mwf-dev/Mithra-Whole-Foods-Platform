import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createOrderShipmentWorkflow } from "@medusajs/medusa/core-flows"

/**
 * POST /tracking-demo/ship
 * Body: { fulfillment_id: string, tracking_number: string }
 *
 * Public — see src/api/tracking-demo/route.ts. Calls the same core workflow
 * Medusa's own admin "Mark as shipped" dialog uses.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { fulfillment_id, tracking_number } = (req.body as any) ?? {}

  if (!fulfillment_id || !tracking_number) {
    res.status(400).json({ message: "fulfillment_id and tracking_number are required" })
    return
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: fulfillments } = await query.graph({
    entity: "fulfillment",
    fields: [
      "id",
      "shipped_at",
      "canceled_at",
      "items.id",
      "items.line_item_id",
      "items.quantity",
      "order.id",
    ],
    filters: { id: fulfillment_id },
  })
  const fulfillment = (fulfillments as any[])[0]

  if (!fulfillment) {
    res.status(404).json({ message: `No fulfillment ${fulfillment_id}` })
    return
  }
  if (fulfillment.canceled_at) {
    res.status(409).json({ message: "Fulfillment is canceled" })
    return
  }
  if (fulfillment.shipped_at) {
    res.status(409).json({ message: "Fulfillment is already shipped" })
    return
  }

  const orderId = fulfillment.order?.id
  if (!orderId) {
    res.status(422).json({ message: "Fulfillment has no linked order" })
    return
  }

  const items = (fulfillment.items ?? []).map((i: any) => ({
    id: i.line_item_id,
    quantity: i.quantity,
  }))

  await createOrderShipmentWorkflow(req.scope).run({
    input: {
      order_id: orderId,
      fulfillment_id,
      items,
      labels: [
        {
          tracking_number,
          tracking_url: `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(
            tracking_number
          )}`,
          label_url: "",
        },
      ],
    } as any,
  })

  res.json({ ok: true, fulfillment_id, tracking_number })
}
