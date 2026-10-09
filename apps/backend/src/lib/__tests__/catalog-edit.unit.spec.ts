import { ProductEditSchema, issuesFor, withUsdPrice } from "../catalog-edit"

describe("withUsdPrice", () => {
  const existing = [
    { id: "p_usd", amount: 3.99, currency_code: "usd" },
    { id: "p_inr", amount: 331, currency_code: "inr" },
  ]
  it("updates USD in place and leaves other currencies untouched", () => {
    expect(withUsdPrice(existing, 4.5)).toEqual([
      { id: "p_inr", amount: 331, currency_code: "inr" },
      { id: "p_usd", amount: 4.5, currency_code: "usd" },
    ])
  })
  it("adds a USD price when there is none", () => {
    expect(withUsdPrice([{ id: "p_inr", amount: 1, currency_code: "inr" }], 2)).toEqual([
      { id: "p_inr", amount: 1, currency_code: "inr" },
      { amount: 2, currency_code: "usd" },
    ])
  })
  it("removes USD when cleared, keeping the rest", () => {
    expect(withUsdPrice(existing, null)).toEqual([{ id: "p_inr", amount: 331, currency_code: "inr" }])
    expect(withUsdPrice(existing, 0)).toHaveLength(1)
  })
  it("rounds to cents", () => {
    expect(withUsdPrice([], 1.005 + 0.0049)[0].amount).toBeCloseTo(1.01, 2)
  })
})

describe("ProductEditSchema", () => {
  it("accepts a valid partial edit", () => {
    expect(ProductEditSchema.safeParse({ title: " Sea Salt ", price: 3.99, stock: 10 }).success).toBe(true)
  })
  it("rejects unknown keys so nothing else (status, handle) can be changed here", () => {
    expect(ProductEditSchema.safeParse({ status: "published" }).success).toBe(false)
    expect(ProductEditSchema.safeParse({ handle: "x" }).success).toBe(false)
  })
  it("rejects bad values", () => {
    expect(ProductEditSchema.safeParse({ title: "" }).success).toBe(false)
    expect(ProductEditSchema.safeParse({ price: -1 }).success).toBe(false)
    expect(ProductEditSchema.safeParse({ stock: 1.5 }).success).toBe(false)
    expect(ProductEditSchema.safeParse({ images: ["http://insecure/x.jpg"] }).success).toBe(false)
    expect(ProductEditSchema.safeParse({ images: ["javascript:alert(1)"] }).success).toBe(false)
  })
})

describe("issuesFor", () => {
  it("flags what a shopper would notice", () => {
    expect(issuesFor({ price: null, images: 0, description: "", stock: 0, manageInventory: true })).toEqual([
      "no_price", "no_photo", "no_description", "out_of_stock",
    ])
    expect(issuesFor({ price: 3, images: 2, description: "ok", stock: 5, manageInventory: true })).toEqual([])
    expect(issuesFor({ price: 3, images: 2, description: "ok", stock: 0, manageInventory: false })).toEqual([])
  })
})
