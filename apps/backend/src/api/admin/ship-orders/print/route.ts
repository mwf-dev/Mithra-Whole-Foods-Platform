import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { renderDocuments, toPrintOrder } from "../../../../lib/print-documents"

const PRINT_FIELDS = [
  "id",
  "display_id",
  "created_at",
  "email",
  "currency_code",
  "metadata",
  "tax_total",
  "discount_total",
  "summary.current_order_total",
  "items.unit_price",
  "items.quantity",
  "items.detail.quantity",
  "items.product_title",
  "items.title",
  "items.variant_sku",
  "shipping_address.first_name",
  "shipping_address.last_name",
  "shipping_address.company",
  "shipping_address.address_1",
  "shipping_address.address_2",
  "shipping_address.city",
  "shipping_address.province",
  "shipping_address.postal_code",
  "shipping_address.country_code",
  "shipping_address.phone",
  "billing_address.first_name",
  "billing_address.last_name",
  "billing_address.company",
  "billing_address.address_1",
  "billing_address.address_2",
  "billing_address.city",
  "billing_address.province",
  "billing_address.postal_code",
  "billing_address.country_code",
  "billing_address.phone",
  "shipping_methods.name",
  "shipping_methods.amount",
  "payment_collections.status",
  "payment_collections.payments.provider_id",
]

const MAX_BATCH = 50
const ID_RE = /^order_[A-Za-z0-9]+$/

/**
 * GET /admin/ship-orders/print?type=packing-slip|invoice&ids=order_a,order_b[&autoprint=1]
 *
 * One printable page per order, in the order requested, so a whole "To ship"
 * queue prints as a stack of packing slips in one go. Opens in a new tab from
 * the Ship orders page; the admin session cookie authenticates it like any
 * other `/admin/*` request.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const type = req.query.type === "invoice" ? "invoice" : "packing-slip"
  const ids = String(req.query.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  if (!ids.length) return res.status(400).json({ message: "Provide ids=order_…,order_…" })
  if (ids.length > MAX_BATCH) return res.status(400).json({ message: `At most ${MAX_BATCH} orders at a time.` })
  if (!ids.every((i) => ID_RE.test(i))) return res.status(400).json({ message: "Invalid order id." })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({ entity: "order", fields: PRINT_FIELDS, filters: { id: ids } })

  const byId = new Map((data as any[]).map((o) => [o.id, o]))
  const ordered = ids.map((i) => byId.get(i)).filter(Boolean).map(toPrintOrder)
  if (!ordered.length) return res.status(404).json({ message: "No matching orders." })

  res.setHeader("Content-Type", "text/html; charset=utf-8")
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:"
  )
  res.send(renderDocuments(ordered, type, { autoprint: req.query.autoprint === "1" }))
}
