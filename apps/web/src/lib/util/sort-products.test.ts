import { describe, expect, it } from "vitest"
import { purchasableFirst } from "./sort-products"

const p = (id: string, amount?: number) =>
  ({ id, variants: [{ calculated_price: amount === undefined ? undefined : { calculated_amount: amount } }] }) as any

describe("purchasableFirst", () => {
  it("moves unpriced products last and keeps order within groups", () => {
    const out = purchasableFirst([p("a"), p("b", 5), p("c", 0), p("d", 9)])
    expect(out.map((x) => x.id)).toEqual(["b", "d", "a", "c"])
  })
  it("treats a product with no variants as not purchasable", () => {
    expect(purchasableFirst([{ id: "x" } as any, p("y", 1)]).map((x) => x.id)).toEqual(["y", "x"])
  })
})
