import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Read-only. Prints every order with its fulfillments, their tracking numbers
 * and the shipped/delivered timestamps — i.e. exactly the state the FedEx
 * webhook is supposed to move.
 */
export default async function inspectFulfillments({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: orders } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "email",
      "status",
      "created_at",
      "fulfillments.id",
      "fulfillments.packed_at",
      "fulfillments.shipped_at",
      "fulfillments.delivered_at",
      "fulfillments.canceled_at",
      "fulfillments.labels.id",
      "fulfillments.labels.tracking_number",
      "fulfillments.labels.tracking_url",
    ],
  })

  console.log(`\n=== ORDERS: ${orders.length} ===\n`)

  for (const o of orders as any[]) {
    const ffs = o.fulfillments ?? []
    console.log(
      `#${o.display_id}  ${o.id}  status=${o.status}  email=${o.email}  fulfillments=${ffs.length}`
    )
    for (const f of ffs) {
      const labels = f.labels ?? []
      console.log(
        `    ff ${f.id}  packed=${f.packed_at ? "Y" : "-"} shipped=${
          f.shipped_at ? "Y" : "-"
        } delivered=${f.delivered_at ? "Y" : "-"} canceled=${
          f.canceled_at ? "Y" : "-"
        }  labels=${labels.length}`
      )
      for (const l of labels) {
        console.log(
          `        label ${l.id} tracking_number=${JSON.stringify(
            l.tracking_number
          )} url=${l.tracking_url}`
        )
      }
    }
  }

  const withTracking = (orders as any[]).flatMap((o) =>
    (o.fulfillments ?? []).flatMap((f: any) =>
      (f.labels ?? []).map((l: any) => ({
        order: o.display_id,
        ff: f.id,
        tn: l.tracking_number,
        delivered: !!f.delivered_at,
      }))
    )
  )

  console.log(`\n=== TRACKING NUMBERS: ${withTracking.length} ===`)
  console.table(withTracking)
}
