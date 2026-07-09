import { clientIpKey } from "../client-ip"

describe("clientIpKey (rate-limit key behind Railway's proxy)", () => {
  it("uses the rightmost X-Forwarded-For entry (appended by the trusted proxy)", () => {
    const key = clientIpKey({
      headers: { "x-forwarded-for": "203.0.113.7, 198.51.100.9" },
      ip: "10.0.0.1",
    })
    expect(key).toBe("198.51.100.9")
  })

  it("ignores a spoofed leftmost entry — attacker-chosen values never become the key", () => {
    const real = clientIpKey({
      headers: { "x-forwarded-for": "198.51.100.9" },
      ip: "10.0.0.1",
    })
    const spoofed = clientIpKey({
      headers: { "x-forwarded-for": "6.6.6.6, 198.51.100.9" },
      ip: "10.0.0.1",
    })
    expect(spoofed).toBe(real)
  })

  it("trims whitespace so keys are stable across header formatting", () => {
    const key = clientIpKey({
      headers: { "x-forwarded-for": "203.0.113.7 ,  198.51.100.9 " },
      ip: "10.0.0.1",
    })
    expect(key).toBe("198.51.100.9")
  })

  it("falls back to req.ip when no X-Forwarded-For header is present", () => {
    expect(clientIpKey({ headers: {}, ip: "192.0.2.4" })).toBe("192.0.2.4")
  })

  it("buckets IPv6 clients by subnet instead of the full /128 address", () => {
    const a = clientIpKey({
      headers: { "x-forwarded-for": "2001:db8:aaaa:bb00::1" },
      ip: "10.0.0.1",
    })
    const b = clientIpKey({
      headers: { "x-forwarded-for": "2001:db8:aaaa:bb00::2" },
      ip: "10.0.0.1",
    })
    expect(a).toBe(b)
    expect(a).not.toBe("2001:db8:aaaa:bb00::1")
  })
})
