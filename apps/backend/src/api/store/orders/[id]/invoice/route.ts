import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { streamInvoicePdf } from "../../../../../lib/invoice-pdf"

/**
 * Renders one order's invoice as a PDF.
 *
 * `authenticate("customer")` is registered for this matcher in
 * `src/api/middlewares.ts`, so `actor_id` below is the caller and cannot be
 * spoofed. That is only half the check: authentication proves they own an
 * account, not that they own *this* order, so the ownership comparison below
 * is what actually stops one shopper reading another's name, address and
 * order history out of a guessed id.
 *
 * (Guests without an account use the signed-link variant — /invoice/:id —
 * generated into their confirmation email; see src/lib/invoice-link.ts.)
 */
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  try {
    const { id } = req.params
    const customerId = req.auth_context?.actor_id

    if (!customerId) {
      return res.status(401).json({ message: "Not authenticated" })
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: [
        "*",
        "items.*",
        "shipping_address.*",
        "shipping_methods.*",
        "summary.*",
      ],
      filters: { id }
    })

  // Deliberately the same 404 for "no such order" and "not yours": a distinct
  // 403 would confirm that an order id exists, which is exactly the probe an
  // attacker enumerating ids is making.
  if (!order || order.customer_id !== customerId) {
    return res.status(404).json({ message: "Order not found" })
  }

  await streamInvoicePdf(res, order)
  } catch (error: any) {
    // Logged in full server-side; the client is told nothing beyond "it
    // failed". The stack used to go out in the response body, which handed a
    // caller the server's file paths and dependency layout.
    console.error(`[store/orders/invoice] failed for ${req.params.id}:`, error)

    // Everything above streams into `res` via `doc.pipe(res)`, so by the time
    // a render error lands here the status and headers are usually already
    // committed. Writing a JSON body then throws ERR_HTTP_HEADERS_SENT and the
    // client gets a truncated PDF instead of an error — destroy the socket so
    // it sees a failed transfer rather than a corrupt file.
    if (res.headersSent) {
      return res.destroy()
    }

    return res.status(500).json({
      message: "An error occurred while generating the invoice",
    })
  }
}
