import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { createOrderShipmentWorkflow } from "@medusajs/medusa/core-flows"

/**
 * Marks a fulfillment as SHIPPED and attaches a tracking number — exactly what
 * the admin "Mark as shipped" dialog does (it calls this same workflow via
 * POST /admin/orders/:id/fulfillments/:ful_id/shipments).
 *
 * This is the step that creates the fulfillment *label*, which is the only
 * thing the FedEx webhook can match a tracking number against.
 *
 * Usage:
 *   npx medusa exec ./src/scripts/test-ship-fulfillment.ts <fulfillment_id> <tracking_number>
 */
export default async function testShipFulfillment({ container, args }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const fulfillmentId = args[0]
  const trackingNumber = args[1] ?? "TEST123456789"

  if (!fulfillmentId) {
    logger.error("Usage: ... test-ship-fulfillment.ts <fulfillment_id> <tracking_number>")
    return
  }

  const {
    data: [fulfillment],
  } = await query.graph({
    entity: "fulfillment",
    fields: [
      "id",
      "shipped_at",
      "delivered_at",
      "canceled_at",
      "items.id",
      "items.line_item_id",
      "items.quantity",
      "labels.tracking_number",
    ],
    filters: { id: fulfillmentId },
  })

  if (!fulfillment) {
    logger.error(`No fulfillment ${fulfillmentId}`)
    return
  }
  if ((fulfillment as any).shipped_at) {
    logger.warn(`Fulfillment ${fulfillmentId} is already shipped — nothing to do`)
    return
  }

  // Resolve the owning order through the order<->fulfillment link.
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "display_id", "fulfillments.id"],
  })
  const order: any = (orders as any[]).find((o) =>
    (o.fulfillments ?? []).some((f: any) => f.id === fulfillmentId)
  )
  if (!order) {
    logger.error(`No order owns fulfillment ${fulfillmentId}`)
    return
  }

  const items = ((fulfillment as any).items ?? []).map((i: any) => ({
    id: i.line_item_id,
    quantity: i.quantity,
  }))

  logger.info(
    `Shipping ${fulfillmentId} on order #${order.display_id} with tracking ${trackingNumber} (${items.length} item(s))`
  )

  const { result } = await createOrderShipmentWorkflow(container).run({
    input: {
      order_id: order.id,
      fulfillment_id: fulfillmentId,
      items,
      labels: [
        {
          tracking_number: trackingNumber,
          tracking_url: `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`,
          label_url: `https://example.test/label/${trackingNumber}.pdf`,
        },
      ],
    } as any,
  })

  logger.info(`Shipment created: ${JSON.stringify((result as any)?.id ?? result)}`)
}
