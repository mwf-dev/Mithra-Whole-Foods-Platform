import {
  deriveStage,
  isValidTrackingNumber,
  missingForShipping,
  paymentState,
  remainingItems,
} from "../ship-orders"

const items = [
  { id: "li_1", quantity: 2 },
  { id: "li_2", quantity: 1 },
]
const ful = (over: any = {}) => ({
  id: "f1",
  items: [{ line_item_id: "li_1", quantity: 2 }, { line_item_id: "li_2", quantity: 1 }],
  ...over,
})

describe("deriveStage", () => {
  it("is to_ship with no fulfillment or only canceled ones", () => {
    expect(deriveStage(items, [])).toBe("to_ship")
    expect(deriveStage(items, [ful({ canceled_at: "2026-01-01" })])).toBe("to_ship")
  })
  it("moves through label_ready, shipped, delivered", () => {
    expect(deriveStage(items, [ful({ packed_at: "x" })])).toBe("label_ready")
    expect(deriveStage(items, [ful({ shipped_at: "x" })])).toBe("shipped")
    expect(deriveStage(items, [ful({ shipped_at: "x", delivered_at: "y" })])).toBe("delivered")
  })
  it("stays to_ship while part of the order is unfulfilled", () => {
    const partial = ful({ items: [{ line_item_id: "li_1", quantity: 2 }] })
    expect(deriveStage(items, [partial])).toBe("to_ship")
  })
})

describe("remainingItems", () => {
  it("returns only what is left", () => {
    const partial = ful({ items: [{ line_item_id: "li_1", quantity: 1 }] })
    expect(remainingItems(items, [partial])).toEqual([
      { id: "li_1", quantity: 1 },
      { id: "li_2", quantity: 1 },
    ])
    expect(remainingItems(items, [ful()])).toEqual([])
  })
  it("ignores canceled fulfillments", () => {
    expect(remainingItems(items, [ful({ canceled_at: "x" })])).toHaveLength(2)
  })
})

describe("paymentState", () => {
  it("treats the system provider as COD", () => {
    expect(paymentState([{ status: "awaiting", payments: [{ provider_id: "pp_system_default" }] }])).toBe("cod")
  })
  it("requires a captured collection for everything else", () => {
    expect(paymentState([{ status: "completed", payments: [{ provider_id: "pp_stripe_stripe" }] }])).toBe("paid")
    expect(paymentState([{ status: "awaiting", payments: [{ provider_id: "pp_stripe_stripe" }] }])).toBe("unpaid")
    expect(paymentState([])).toBe("unpaid")
  })
})

describe("missingForShipping", () => {
  it("lists missing fields", () => {
    expect(missingForShipping({ first_name: "A", address_1: "1 St" }, "a@b.co")).toEqual(
      expect.arrayContaining(["city", "ZIP code", "phone"])
    )
    expect(
      missingForShipping(
        { first_name: "A", address_1: "1", city: "X", province: "PA", postal_code: "1", country_code: "us", phone: "1" },
        "a@b.co"
      )
    ).toEqual([])
  })
})

describe("isValidTrackingNumber", () => {
  it("accepts carrier-style numbers and rejects junk", () => {
    expect(isValidTrackingNumber("1Z999AA10123456784")).toBe(true)
    expect(isValidTrackingNumber("12")).toBe(false)
    expect(isValidTrackingNumber("<script>")).toBe(false)
    expect(isValidTrackingNumber(undefined)).toBe(false)
  })
})
