import { EMAIL_TEMPLATES, renderEmail } from "../email-templates"

describe("renderEmail", () => {
  it("renders every declared template", () => {
    for (const t of EMAIL_TEMPLATES) {
      const out = renderEmail(t, { order_id: "#ORD-1", reset_url: "https://x.test/r", items: [], tracking: [] })
      expect(out?.subject).toBeTruthy()
      expect(out?.html).toContain("Mithra Whole Foods")
    }
  })

  it("escapes customer-controlled values", () => {
    const out = renderEmail("order-placed", {
      order_id: "#1",
      shipping_address: '<script>alert(1)</script>',
      items: [{ title: '"><img src=x>', quantity: 1, total: "$1" }],
    })!
    expect(out.html).not.toContain("<script>")
    expect(out.html).not.toContain("<img")
  })

  it("returns null for an unknown template", () => {
    expect(renderEmail("nope", {})).toBeNull()
  })
})

import { formatMoney, latestRefundAmount } from "../refund-email"

describe("new emails", () => {
  it("manual delivery email shows the note, escaped", () => {
    const out = renderEmail("order-out-for-delivery", { order_id: "#1", note: "<b>door</b>" })!
    expect(out.html).toContain("&lt;b&gt;door")
    expect(out.subject).toContain("out for delivery")
  })
  it("refund email names the amount", () => {
    expect(renderEmail("order-refunded", { order_id: "#1", amount: "$5.00" })!.html).toContain("$5.00")
  })
  it("picks the latest refund", () => {
    expect(
      latestRefundAmount([
        { amount: 3, created_at: "2026-10-01" },
        { amount: 7, created_at: "2026-10-02" },
      ])
    ).toBe(7)
    expect(latestRefundAmount([])).toBeNull()
    expect(formatMoney(12.5, "usd")).toBe("$12.50")
  })
})
