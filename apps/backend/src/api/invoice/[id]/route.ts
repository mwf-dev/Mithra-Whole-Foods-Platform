import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  invoiceSignSecret,
  verifyInvoiceToken,
} from "../../../lib/invoice-link"
import { streamInvoicePdf } from "../../../lib/invoice-pdf"

/**
 * GET /invoice/:id?t=… — the signed guest invoice link (C9): guests never
 * authenticate, so the order-confirmation email carries an HMAC-pinned URL
 * (see src/lib/invoice-link.ts) that streams the same PDF as the
 * authenticated /store/orders/:id/invoice route.
 *
 * Fails closed: no secret configured, no token, or a wrong token → 401, and
 * the same single 404 as the authenticated route for "no such order" so the
 * existence of an order id is not leaking to a token-holder's guesses (though
 * a valid HMAC already implies the id).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const { id } = req.params
  const token = String(req.query.t ?? "")

  const secret = invoiceSignSecret()
  if (!secret) {
    console.error("[invoice-link] no signing secret (INVOICE_LINK_SECRET / COOKIE_SECRET) — refusing to serve")
    return res.status(500).json({ message: "Invoice links are not configured" })
  }

  if (!verifyInvoiceToken(id, token, secret)) {
    return res.status(401).json({ message: "Invalid invoice link" })
  }

  try {
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["*", "items.*", "shipping_address.*", "shipping_methods.*", "summary.*"],
      filters: { id },
    })

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    await streamInvoicePdf(res, order)
  } catch (error: any) {
    console.error(`[invoice-link] failed for ${id}:`, error)
    if (res.headersSent) {
      return res.destroy()
    }
    return res.status(500).json({
      message: "An error occurred while generating the invoice",
    })
  }
}
