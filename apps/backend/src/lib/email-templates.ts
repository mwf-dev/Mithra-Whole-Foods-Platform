/**
 * Transactional email templates, rendered in code so they ship with the
 * backend (no vendor-side template ids). Keys are the `template` strings the
 * subscribers pass to Medusa's notification module.
 */
export type EmailTemplate =
  | "order-placed"
  | "admin-new-order"
  | "order-shipped"
  | "order-delivered"
  | "order-out-for-delivery"
  | "order-canceled"
  | "order-refunded"
  | "password-reset"

export const EMAIL_TEMPLATES: readonly EmailTemplate[] = [
  "order-placed",
  "admin-new-order",
  "order-shipped",
  "order-delivered",
  "order-out-for-delivery",
  "order-canceled",
  "order-refunded",
  "password-reset",
]

export const esc = (v: unknown): string =>
  String(v ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  )

const BRAND = "#2E7D32"

function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;background:#FAF7F1;font-family:Arial,Helvetica,sans-serif;color:#222">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:24px 12px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:8px;overflow:hidden">
<tr><td style="background:${BRAND};color:#fff;padding:16px 24px;font-size:20px;font-weight:bold">Mithra Whole Foods</td></tr>
<tr><td style="padding:24px"><h1 style="font-size:20px;margin:0 0 16px">${esc(title)}</h1>${body}</td></tr>
<tr><td style="padding:16px 24px;font-size:12px;color:#777;border-top:1px solid #eee">Mithra Whole Foods · Exton, PA</td></tr>
</table></td></tr></table></body></html>`
}

const button = (url: string, label: string) =>
  `<p style="margin:24px 0"><a href="${esc(url)}" style="background:${BRAND};color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">${esc(label)}</a></p>`

function itemsTable(items: any[] = []): string {
  const rows = items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0">${esc(i.title)} × ${esc(i.quantity)}</td><td align="right">${esc(i.total)}</td></tr>`
    )
    .join("")
  return `<table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #eee;margin-top:12px">${rows}</table>`
}

function trackingList(tracking: any[] = []): string {
  if (!tracking.length) return ""
  return (
    "<ul>" +
    tracking
      .filter((t) => t?.number)
      .map((t) =>
        t.url
          ? `<li><a href="${esc(t.url)}">${esc(t.number)}</a></li>`
          : `<li>${esc(t.number)}</li>`
      )
      .join("") +
    "</ul>"
  )
}

export function renderEmail(
  template: string,
  d: Record<string, any>
): { subject: string; html: string } | null {
  switch (template as EmailTemplate) {
    case "order-placed":
      return {
        subject: `Order ${d.order_id} confirmed`,
        html: layout(
          "Thank you for your order!",
          `<p>We've received order <b>${esc(d.order_id)}</b> placed on ${esc(d.order_date)}.</p>
${itemsTable(d.items)}
<p>Subtotal: ${esc(d.subtotal)}<br>Shipping: ${esc(d.shipping_total)}<br><b>Total: ${esc(d.total)}</b></p>
<p><b>Shipping to:</b><br>${esc(d.shipping_address)}</p>
${d.invoice_url ? button(d.invoice_url, "Download invoice (PDF)") : ""}
${d.track_url ? button(d.track_url, "Track your order") : ""}`
        ),
      }
    case "admin-new-order":
      return {
        subject: `New order ${d.order_id} — ${d.total}`,
        html: layout(
          "New order received",
          `<p>Order <b>${esc(d.order_id)}</b> from ${esc(d.email)}.</p>${itemsTable(d.items)}
<p><b>Total: ${esc(d.total)}</b></p><p>Ship to: ${esc(d.shipping_address)}</p>`
        ),
      }
    case "order-shipped":
      return {
        subject: `Order ${d.order_id} has shipped`,
        html: layout(
          "Your order is on its way",
          `<p>Order <b>${esc(d.order_id)}</b> has shipped.</p>${trackingList(d.tracking)}
${d.track_url ? button(d.track_url, "Track your order") : ""}`
        ),
      }
    case "order-delivered":
      return {
        subject: `Order ${d.order_id} was delivered`,
        html: layout(
          "Your order was delivered",
          `<p>Order <b>${esc(d.order_id)}</b> has been delivered. We hope you enjoy it!</p>
<p>If anything is wrong, just reply to this email.</p>`
        ),
      }
    case "order-out-for-delivery":
      return {
        subject: `Order ${d.order_id} is out for delivery`,
        html: layout(
          "Your order is out for delivery",
          `<p>Order <b>${esc(d.order_id)}</b> is on its way and will be delivered by our own team.</p>
${d.note ? `<p><b>Delivery note:</b> ${esc(d.note)}</p>` : ""}
<p>Please keep your phone nearby in case we need to reach you.</p>
${d.track_url ? button(d.track_url, "Track your order") : ""}`
        ),
      }
    case "order-canceled":
      return {
        subject: `Order ${d.order_id} was canceled`,
        html: layout(
          "Your order was canceled",
          `<p>Order <b>${esc(d.order_id)}</b> has been canceled.</p>
<p>If you paid by card, any charge will be returned to your original payment method; your bank can take a few business days to show it.</p>
<p>Questions? Just reply to this email.</p>`
        ),
      }
    case "order-refunded":
      return {
        subject: `Refund issued for order ${d.order_id}`,
        html: layout(
          "Your refund is on its way",
          `<p>We've refunded <b>${esc(d.amount)}</b> for order <b>${esc(d.order_id)}</b>.</p>
<p>It goes back to your original payment method. Banks usually take 5–10 business days to show it.</p>
<p>Questions? Just reply to this email.</p>`
        ),
      }
    case "password-reset":
      return {
        subject: "Reset your Mithra password",
        html: layout(
          "Reset your password",
          `<p>We received a request to reset your password. This link expires in 15 minutes.</p>
${button(d.reset_url, "Choose a new password")}
<p style="color:#777;font-size:13px">If you didn't ask for this, you can ignore this email.</p>`
        ),
      }
    default:
      return null
  }
}
