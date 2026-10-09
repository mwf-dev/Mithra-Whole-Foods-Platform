import { BUSINESS } from "./business"
import { paymentState, type PaymentState } from "./ship-orders"
import { esc } from "./email-templates"

/**
 * Print-ready packing slips and invoices. Plain HTML + print CSS: the operator
 * opens the page and uses the browser's Print / Save as PDF, so it looks the
 * same on screen, on paper and as a PDF, with no PDF library to maintain.
 */
export type PrintAddress = {
  name: string
  lines: string[]
  phone?: string | null
}

export type PrintOrder = {
  number: string
  placedAt: string
  email: string | null
  shipTo: PrintAddress
  billTo: PrintAddress | null
  shippingMethod: string | null
  payment: PaymentState
  currency: string
  items: { title: string; sku: string | null; quantity: number; unitPrice: number; total: number }[]
  shipping: number
  tax: number
  discount: number
  total: number
}

const num = (v: unknown) => Number(v ?? 0) || 0

function address(a: any): PrintAddress | null {
  if (!a || !(a.address_1 || a.first_name)) return null
  return {
    name: `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Customer",
    lines: [
      a.company,
      a.address_1,
      a.address_2,
      `${a.city ?? ""}${a.province ? ", " + a.province : ""} ${a.postal_code ?? ""}`.trim(),
      a.country_code ? String(a.country_code).toUpperCase() : null,
    ].filter(Boolean) as string[],
    phone: a.phone ?? null,
  }
}

/** Raw `query.graph` order → what the templates need. Totals come from the lines. */
export function toPrintOrder(o: any): PrintOrder {
  const items = ((o.items ?? []) as any[]).map((i) => {
    const quantity = num(i.detail?.quantity ?? i.quantity)
    const unitPrice = num(i.unit_price)
    return {
      title: i.product_title || i.title || "Item",
      sku: i.variant_sku ?? null,
      quantity,
      unitPrice,
      total: unitPrice * quantity,
    }
  })
  const shipping = ((o.shipping_methods ?? []) as any[]).reduce((n, m) => n + num(m.amount), 0)
  const tax = num(o.tax_total)
  const discount = num(o.discount_total)
  const computed = items.reduce((n, i) => n + i.total, 0) + shipping + tax - discount
  return {
    number: o.metadata?.order_number ?? `#${o.display_id}`,
    placedAt: o.created_at,
    email: o.email ?? null,
    shipTo: address(o.shipping_address) ?? { name: "Customer", lines: [] },
    billTo: address(o.billing_address),
    shippingMethod: o.shipping_methods?.[0]?.name ?? null,
    payment: paymentState(o.payment_collections),
    currency: (o.currency_code || "usd").toLowerCase(),
    items,
    shipping,
    tax,
    discount,
    // The order's own total is authoritative; fall back to the sum of its lines.
    total: num(o.summary?.current_order_total) || computed,
  }
}

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

const addr = (a: PrintAddress | null) =>
  a
    ? `<strong>${esc(a.name)}</strong><br>${a.lines.map(esc).join("<br>")}${a.phone ? `<br>${esc(a.phone)}` : ""}`
    : "—"

const header = (title: string, o: PrintOrder) => `
<header>
  <div>
    <div class="brand">${esc(BUSINESS.name)}</div>
    <div class="muted">${esc(BUSINESS.legalName)}<br>${BUSINESS.addressLines.map(esc).join("<br>")}<br>${esc(BUSINESS.phone)} · ${esc(BUSINESS.email)}</div>
  </div>
  <div class="right">
    <div class="doc">${esc(title)}</div>
    <div>Order <strong>${esc(o.number)}</strong></div>
    <div class="muted">${esc(date(o.placedAt))}</div>
  </div>
</header>`

function packingSlip(o: PrintOrder): string {
  const rows = o.items
    .map(
      (i) => `<tr>
  <td class="box">☐</td>
  <td>${esc(i.title)}${i.sku ? `<div class="muted sku">${esc(i.sku)}</div>` : ""}</td>
  <td class="qty">${i.quantity}</td>
</tr>`
    )
    .join("")
  const units = o.items.reduce((n, i) => n + i.quantity, 0)
  return `<section class="page">
${header("PACKING SLIP", o)}
<div class="cols">
  <div><h3>Ship to</h3><p>${addr(o.shipTo)}</p></div>
  <div><h3>Shipping</h3><p>${esc(o.shippingMethod ?? "—")}${o.payment === "cod" ? "<br><strong>COLLECT PAYMENT ON DELIVERY</strong>" : ""}</p></div>
</div>
<table>
  <thead><tr><th class="box"></th><th>Item</th><th class="qty">Qty</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><td></td><td class="right">Total units</td><td class="qty">${units}</td></tr></tfoot>
</table>
<div class="sign"><span>Packed by: ____________________</span><span>Checked by: ____________________</span></div>
<p class="thanks">Thank you for shopping with ${esc(BUSINESS.name)}! Questions? ${esc(BUSINESS.phone)} · ${esc(BUSINESS.email)}</p>
</section>`
}

function invoice(o: PrintOrder): string {
  const money = new Intl.NumberFormat("en-US", { style: "currency", currency: o.currency.toUpperCase() })
  const rows = o.items
    .map(
      (i) => `<tr>
  <td>${esc(i.title)}</td>
  <td class="qty">${i.quantity}</td>
  <td class="num">${money.format(i.unitPrice)}</td>
  <td class="num">${money.format(i.total)}</td>
</tr>`
    )
    .join("")
  const status =
    o.payment === "paid" ? "PAID" : o.payment === "cod" ? "PAYMENT DUE ON DELIVERY" : "UNPAID"
  return `<section class="page">
${header("INVOICE", o)}
<div class="cols">
  <div><h3>Bill to</h3><p>${addr(o.billTo ?? o.shipTo)}${o.email ? `<br>${esc(o.email)}` : ""}</p></div>
  <div><h3>Ship to</h3><p>${addr(o.shipTo)}</p></div>
  <div><h3>Status</h3><p class="status ${o.payment}">${status}</p><p class="muted">${esc(o.shippingMethod ?? "")}</p></div>
</div>
<table>
  <thead><tr><th>Item</th><th class="qty">Qty</th><th class="num">Price</th><th class="num">Amount</th></tr></thead>
  <tbody>${rows}</tbody>
</table>
<table class="totals">
  <tr><td>Subtotal</td><td class="num">${money.format(o.items.reduce((n, i) => n + i.total, 0))}</td></tr>
  <tr><td>Shipping</td><td class="num">${money.format(o.shipping)}</td></tr>
  ${o.discount ? `<tr><td>Discount</td><td class="num">−${money.format(o.discount)}</td></tr>` : ""}
  <tr><td>Tax</td><td class="num">${money.format(o.tax)}</td></tr>
  <tr class="grand"><td>Total</td><td class="num">${money.format(o.total)}</td></tr>
</table>
<p class="thanks">Thank you for your order! ${esc(BUSINESS.legalName)}${BUSINESS.website ? ` · ${esc(BUSINESS.website)}` : ""}</p>
</section>`
}

const CSS = `
*{box-sizing:border-box}body{margin:0;font:13px/1.45 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1f2a1f;background:#eee}
.bar{position:sticky;top:0;background:#2E7D32;color:#fff;padding:10px 20px;display:flex;gap:12px;align-items:center}
.bar button{background:#fff;color:#2E7D32;border:0;border-radius:6px;padding:8px 16px;font-weight:600;cursor:pointer}
.page{background:#fff;width:8.5in;min-height:11in;margin:16px auto;padding:.6in;page-break-after:always;box-shadow:0 1px 6px rgba(0,0,0,.15)}
header{display:flex;justify-content:space-between;gap:24px;border-bottom:2px solid #2E7D32;padding-bottom:14px}
.brand{font-size:22px;font-weight:700;color:#2E7D32}.doc{font-size:22px;font-weight:700;letter-spacing:.04em}
.right{text-align:right}.muted{color:#6b756b;font-size:12px}.sku{font-size:11px}
.cols{display:flex;gap:28px;margin:18px 0}.cols>div{flex:1}h3{margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#6b756b}p{margin:0}
table{width:100%;border-collapse:collapse;margin-top:8px}th{text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b756b;border-bottom:1px solid #ccd3cc;padding:8px 6px}
td{padding:9px 6px;border-bottom:1px solid #eef0ee;vertical-align:top}.qty{text-align:center;width:70px}.num{text-align:right;width:110px}.box{width:28px;font-size:18px;text-align:center}
tfoot td{border:0;font-weight:700}.totals{width:300px;margin-left:auto;margin-top:14px}.totals td{border:0;padding:4px 6px}.grand td{border-top:2px solid #1f2a1f;font-weight:700;font-size:15px;padding-top:8px}
.status{font-weight:700}.status.paid{color:#2E7D32}.status.cod{color:#b45309}.status.unpaid{color:#b91c1c}
.sign{display:flex;justify-content:space-between;margin-top:36px;color:#6b756b}.thanks{margin-top:28px;text-align:center;color:#6b756b;font-size:12px}
@media print{body{background:#fff}.bar{display:none}.page{box-shadow:none;margin:0;width:auto;min-height:0;padding:0}@page{size:letter;margin:.5in}}
`

export function renderDocuments(
  orders: PrintOrder[],
  type: "packing-slip" | "invoice",
  opts: { autoprint?: boolean } = {}
): string {
  const title = type === "packing-slip" ? "Packing slips" : "Invoices"
  const body = orders.map((o) => (type === "packing-slip" ? packingSlip(o) : invoice(o))).join("\n")
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — ${orders.length} order${orders.length === 1 ? "" : "s"}</title><style>${CSS}</style></head>
<body><div class="bar"><span>${esc(title)} (${orders.length})</span><button onclick="window.print()">Print / Save as PDF</button></div>
${body}${opts.autoprint ? "<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300))</script>" : ""}</body></html>`
}
