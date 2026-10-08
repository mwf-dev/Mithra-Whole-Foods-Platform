import { samePhone } from "../phone"

describe("samePhone", () => {
  it("matches across formatting and country code", () => {
    expect(samePhone("610-202-3456", "(610) 202 3456")).toBe(true)
    expect(samePhone("+1 610 202 3456", "6102023456")).toBe(true)
  })
  it("rejects different, short or empty numbers", () => {
    expect(samePhone("610-202-3456", "610-202-3457")).toBe(false)
    expect(samePhone("12345", "12345")).toBe(false)
    expect(samePhone("", "")).toBe(false)
    expect(samePhone(undefined, "6102023456")).toBe(false)
  })
})
