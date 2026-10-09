import { renderDocuments, toPrintOrder } from "../print-documents"

const raw = {
  display_id: 15,
  created_at: "2026-08-30T06:10:51.560Z",
  email: "a@b.co",
  currency_code: "usd",
  metadata: { order_number: "ORD-FACCB9" },
  tax_total: 0,
  discount_total: 0,
  summary: { current_order_total: 28.99 },
  items: [{ unit_price: 18.99, quantity: null, detail: { quantity: 1 }, product_title: "Cow Ghee - 1L", variant_sku: "ghee-1l" }],
  shipping_address: { first_name: "Asha", last_name: "Rao", address_1: "12 Oak St", city: "Exton", province: "PA", postal_code: "19341", country_code: "us", phone: "+16105550123" },
  billing_address: null,
  shipping_methods: [{ name: "Express Shipping", amount: 10 }],
  payment_collections: [{ status: "awaiting", payments: [{ provider_id: "pp_system_default" }] }],
}

describe("toPrintOrder", () => {
  it("reads quantity from detail and uses the order total", () => {
    const o = toPrintOrder(raw)
    expect(o.number).toBe("ORD-FACCB9")
    expect(o.items[0]).toMatchObject({ quantity: 1, unitPrice: 18.99, total: 18.99, sku: "ghee-1l" })
    expect(o.shipping).toBe(10)
    expect(o.total).toBe(28.99)
    expect(o.payment).toBe("cod")
    expect(o.shipTo.lines).toContain("EXTON, PA 19341".replace("EXTON", "Exton"))
  })
  it("falls back to the sum of its lines when no summary total", () => {
    expect(toPrintOrder({ ...raw, summary: null }).total).toBeCloseTo(28.99)
  })
})

describe("renderDocuments", () => {
  it("packing slips have no prices and warn on COD", () => {
    const html = renderDocuments([toPrintOrder(raw)], "packing-slip")
    expect(html).toContain("PACKING SLIP")
    expect(html).toContain("COLLECT PAYMENT ON DELIVERY")
    expect(html).toContain("Cow Ghee - 1L")
    expect(html).not.toContain("$18.99")
  })
  it("invoices show line, shipping and total", () => {
    const html = renderDocuments([toPrintOrder(raw)], "invoice")
    expect(html).toContain("INVOICE")
    expect(html).toContain("$18.99")
    expect(html).toContain("$10.00")
    expect(html).toContain("$28.99")
    expect(html).toContain("PAYMENT DUE ON DELIVERY")
  })
  it("escapes customer-controlled text and only autoprints when asked", () => {
    const evil = toPrintOrder({ ...raw, shipping_address: { ...raw.shipping_address, first_name: "<script>alert(1)</script>" } })
    const html = renderDocuments([evil], "invoice")
    expect(html).not.toContain("<script>alert(1)</script>")
    expect(html).not.toContain("window.print()'")
    expect(renderDocuments([evil], "invoice", { autoprint: true })).toContain("window.print()")
  })
  it("renders one page per order", () => {
    const html = renderDocuments([toPrintOrder(raw), toPrintOrder(raw)], "packing-slip")
    expect(html.match(/<section class="page">/g)).toHaveLength(2)
  })
})
