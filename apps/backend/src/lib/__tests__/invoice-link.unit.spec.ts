import { invoiceSignSecret, signInvoiceToken, verifyInvoiceToken } from "../invoice-link"

describe("invoice link tokens", () => {
  it("round-trips a valid token", () => {
    const secret = "s3cret"
    const t = signInvoiceToken("order_123", secret)
    expect(verifyInvoiceToken("order_123", t, secret)).toBe(true)
  })

  it("rejects a token pinned to a different order", () => {
    const secret = "s3cret"
    const t = signInvoiceToken("order_123", secret)
    expect(verifyInvoiceToken("order_999", t, secret)).toBe(false)
  })

  it("rejects wrong secrets, missing inputs and tampering", () => {
    const t = signInvoiceToken("order_123", "s3cret")
    expect(verifyInvoiceToken("order_123", t, "other")).toBe(false)
    expect(verifyInvoiceToken("order_123", "", "s3cret")).toBe(false)
    expect(verifyInvoiceToken("", t, "s3cret")).toBe(false)
    expect(verifyInvoiceToken("order_123", "garbage", "s3cret")).toBe(false)
    expect(verifyInvoiceToken("order_123", t + "x", "s3cret")).toBe(false)
  })

  it("falls back to COOKIE_SECRET and to the dev secret", () => {
    const cookiePrev = process.env.COOKIE_SECRET
    const jwtPrev = process.env.JWT_SECRET
    const explicitPrev = process.env.INVOICE_LINK_SECRET
    const nodePrev = process.env.NODE_ENV
    delete process.env.COOKIE_SECRET
    delete process.env.JWT_SECRET
    delete process.env.INVOICE_LINK_SECRET
    process.env.NODE_ENV = "production"
    expect(invoiceSignSecret()).toBeNull() // production, nothing set
    process.env.COOKIE_SECRET = "cookie-secret"
    expect(invoiceSignSecret()).toBe("cookie-secret")
    delete process.env.COOKIE_SECRET
    process.env.NODE_ENV = "development"
    expect(invoiceSignSecret()).toBe("dev-invoice-secret")
    // Restore whatever the suite had.
    process.env.NODE_ENV = nodePrev
    for (const [k, v] of Object.entries({ COOKIE_SECRET: cookiePrev, JWT_SECRET: jwtPrev })) {
      if (v === undefined) delete (process.env as any)[k]
      else (process.env as any)[k] = v
    }
    if (explicitPrev === undefined) delete process.env.INVOICE_LINK_SECRET
    else process.env.INVOICE_LINK_SECRET = explicitPrev
  })
})
