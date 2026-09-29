import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { existsSync } from "fs"
import PDFDocument from "pdfkit"

/**
 * Renders one order's invoice as a PDF.
 *
 * `authenticate("customer")` is registered for this matcher in
 * `src/api/middlewares.ts`, so `actor_id` below is the caller and cannot be
 * spoofed. That is only half the check: authentication proves they own an
 * account, not that they own *this* order, so the ownership comparison below
 * is what actually stops one shopper reading another's name, address and
 * order history out of a guessed id.
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

  const orderNumber = order.metadata?.order_number || order.display_id

  // Create a document
  const doc = new PDFDocument({ margin: 50 })

  res.setHeader("Content-Type", "application/pdf")
  res.setHeader("Content-Disposition", `attachment; filename="invoice-${orderNumber}.pdf"`)

  doc.pipe(res)

  // --- Header ---
  // Was hardcoded to an absolute path inside one developer's home directory,
  // which of course resolves nowhere else. The deployed image only contains
  // `.medusa/server` (see apps/backend/Dockerfile), so there is no logo file
  // in production at all and every invoice quietly used the text fallback
  // below. Point INVOICE_LOGO_PATH at a readable file to get the image back;
  // absent that, the wordmark is a deliberate, working default rather than an
  // accident.
  const logoPath = process.env.INVOICE_LOGO_PATH

  if (logoPath && existsSync(logoPath)) {
    try {
      doc.image(logoPath, 50, 45, { width: 120 })
    } catch (e) {
      console.warn(`[invoice] could not render logo at ${logoPath}:`, e)
      doc.fontSize(20).text("Mithra Whole Foods", 50, 57)
    }
  } else {
    doc.fontSize(20).text("Mithra Whole Foods", 50, 57)
  }

  doc
    .fillColor("#444444")
    .fontSize(24)
    .font("Helvetica-Bold")
    .text("INVOICE", 50, 50, { align: "right" })
    .fontSize(10)
    .font("Helvetica")
    .text(`Order Number: ${orderNumber}`, 50, 80, { align: "right" })
    .text(`Order Date: ${new Date(order.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`, 50, 95, { align: "right" })
    .moveDown()

  // --- Company Info ---
  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .text("Mithra Whole Foods", 50, 110)
    .font("Helvetica")
    .text("support@mithrawholefoods.com", 50, 125)
    .text("www.mithrawholefoods.com", 50, 140)

  // Divider
  doc.moveTo(50, 165).lineTo(550, 165).lineWidth(1).strokeColor("#dddddd").stroke()

  // --- Addresses ---
  doc.moveDown(2)
  if (order.shipping_address) {
    doc.font("Helvetica-Bold").text(`Ship To:`, 50, 185)
    doc.font("Helvetica").text(`${order.shipping_address.first_name || ""} ${order.shipping_address.last_name || ""}`, 50, 200)
    doc.text(order.shipping_address.address_1 || "", 50, 215)
    let nextY = 230
    if (order.shipping_address.address_2) {
      doc.text(order.shipping_address.address_2, 50, nextY)
      nextY += 15
    }
    doc.text(`${order.shipping_address.city || ""}, ${order.shipping_address.province || ""} ${order.shipping_address.postal_code || ""}`, 50, nextY)
    doc.text(order.shipping_address.country_code?.toUpperCase() || "", 50, nextY + 15)
  }

  // --- Items table ---
  let y = 300

  // Table Header Background
  doc.rect(50, y - 5, 500, 25).fill("#f7f7f7")

  doc.fillColor("#333333").font("Helvetica-Bold")
  doc.text("Item", 60, y)
  doc.text("Quantity", 280, y, { width: 60, align: "center" })
  doc.text("Price", 350, y, { width: 80, align: "right" })
  doc.text("Total", 440, y, { width: 100, align: "right" })
  doc.font("Helvetica")
  
  y += 25

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount)
  }
  
  const currency = order.currency_code || "usd"

  let computedSubtotal = 0

  // Draw Table Rows
  for (const item of order.items || []) {
    if (!item) continue
    
    const title = item.product_title || item.title || "Item"
    const quantity = item.quantity ?? item.detail?.quantity ?? 1
    const price = Number(item.unit_price || item.detail?.unit_price || 0)
    
    // In Medusa v2, item.total might not be returned by query.graph
    const itemTotal = price * quantity
    computedSubtotal += itemTotal
    
    // Line separator
    doc.moveTo(50, y - 5).lineTo(550, y - 5).lineWidth(0.5).strokeColor("#eeeeee").stroke()

    doc.fillColor("#555555").text(title, 60, y, { width: 200 })
    doc.text(String(quantity), 280, y, { width: 60, align: "center" })
    doc.text(formatCurrency(price, currency), 350, y, { width: 80, align: "right" })
    doc.text(formatCurrency(itemTotal, currency), 440, y, { width: 100, align: "right" })
    
    // calculate y offset based on string height
    const textHeight = doc.heightOfString(title, { width: 200 })
    y += Math.max(textHeight, 15) + 10
  }

  // Divider
  doc.moveTo(50, y).lineTo(550, y).lineWidth(1).strokeColor("#dddddd").stroke()
  y += 15

  // --- Compute Totals ---
  const shippingTotal = (order.shipping_methods || []).reduce((acc: number, method: any) => acc + Number(method.amount || 0), 0)
  
  // Use summary from graph if available, else sum them up
  const orderTotal = order.summary?.current_order_total ?? (computedSubtotal + shippingTotal)
  
  // Tax might be missing from graph, so infer it if orderTotal > subtotal + shipping
  const inferredTax = Math.max(0, orderTotal - computedSubtotal - shippingTotal)

  // --- Totals Display ---
  doc.fillColor("#444444")
  doc.text("Subtotal:", 350, y, { width: 80, align: "right" })
  doc.text(formatCurrency(computedSubtotal, currency), 440, y, { width: 100, align: "right" })
  
  y += 20
  doc.text("Shipping:", 350, y, { width: 80, align: "right" })
  doc.text(formatCurrency(shippingTotal, currency), 440, y, { width: 100, align: "right" })

  y += 20
  doc.text("Tax:", 350, y, { width: 80, align: "right" })
  doc.text(formatCurrency(inferredTax, currency), 440, y, { width: 100, align: "right" })

  y += 25
  doc.rect(340, y - 5, 210, 25).fill("#f7f7f7")
  doc.fillColor("#000000").font("Helvetica-Bold")
  doc.text("Total:", 350, y, { width: 80, align: "right" })
  doc.text(formatCurrency(orderTotal, currency), 440, y, { width: 100, align: "right" })

  // --- Footer ---
  doc.moveDown(4)
  doc.font("Helvetica-Oblique").fillColor("#888888")
    .text("Thank you for shopping with Mithra Whole Foods!", 50, doc.y, { align: "center" })

  doc.end()
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
