import { ordersOpen } from "../launch"

describe("ordersOpen", () => {
  it("is closed by default", () => {
    expect(ordersOpen({})).toBe(false)
    expect(ordersOpen({ ORDERS_OPEN: "" })).toBe(false)
  })

  it("opens only on an explicit true", () => {
    expect(ordersOpen({ ORDERS_OPEN: "true" })).toBe(true)
    expect(ordersOpen({ ORDERS_OPEN: " TRUE " })).toBe(true)
  })

  it("stays closed for anything else", () => {
    for (const v of ["false", "1", "yes", "open", "0"]) {
      expect(ordersOpen({ ORDERS_OPEN: v })).toBe(false)
    }
  })
})
