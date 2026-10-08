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
