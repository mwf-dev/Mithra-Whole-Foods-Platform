import { describe, expect, it } from "vitest"
import { HttpTypes } from "@medusajs/types"
import { groupBySize, splitTitle } from "./card-model"

describe("splitTitle", () => {
  it.each([
    ["Sastra Pure Cow Ghee - 100ml (3.2 Oz)", "Sastra Pure Cow Ghee", "100 ml"],
    ["Sastra Pure Cow Ghee - 16L", "Sastra Pure Cow Ghee", "16 L"],
    ["Extra Virgin Sesame Oil (2L)", "Extra Virgin Sesame Oil", "2 L"],
    ["Red Rice (Sivapu Arisi) - 10 lbs", "Red Rice (Sivapu Arisi)", "10 lbs"],
    ["Moong Dal - 1lb", "Moong Dal", "1 lb"],
    ["Palm Candy | Panakarkandu - 1lb", "Palm Candy | Panakarkandu", "1 lb"],
    ["Beetroot Malt - 250g", "Beetroot Malt", "250 g"],
  ])("%s", (title, base, size) => {
    expect(splitTitle(title)).toEqual({ base, size })
  })

  it("leaves unsized titles whole", () => {
    expect(splitTitle("Karupatti / Palm Jaggery Assorted Sweets")).toEqual({
      base: "Karupatti / Palm Jaggery Assorted Sweets",
      size: null,
    })
  })

  it("does not read a word starting with l/g as a unit", () => {
    expect(splitTitle("2 Little Millets").size).toBeNull()
  })
})

const product = (id: string, title: string, amount: number) =>
  ({
    id,
    title,
    variants: [
      {
        id: `v_${id}`,
        // Shape Medusa returns for `*variants.calculated_price`.
        calculated_price: {
          calculated_amount: amount,
          original_amount: amount,
          currency_code: "usd",
          calculated_price: { price_list_type: null },
        },
      },
    ],
  }) as unknown as HttpTypes.StoreProduct

describe("groupBySize", () => {
  it("merges pack sizes of one product, cheapest first, keeping first-seen order", () => {
    const groups = groupBySize([
      product("castor", "Cold Pressed Castor Oil (500ml)", 10.99),
      product("ghee1l", "Sastra Pure Cow Ghee - 1L (32 Oz)", 18.99),
      product("ghee100", "Sastra Pure Cow Ghee - 100ml (3.2 Oz)", 1.99),
      product("ghee16", "Sastra Pure Cow Ghee - 16L", 304.99),
    ])
    expect(groups.map((g) => g.map((p) => p.id))).toEqual([
      ["castor"],
      ["ghee100", "ghee1l", "ghee16"],
    ])
  })

  it("never merges unsized products that share a name", () => {
    const groups = groupBySize([
      product("a", "Assorted Sweets", 5),
      product("b", "Assorted Sweets", 6),
    ])
    expect(groups).toHaveLength(2)
  })

  it("keeps different products with similar names apart", () => {
    const groups = groupBySize([
      product("m1", "Moong Dal - 1lb", 3.99),
      product("m2", "Green Moong Dal - 2lbs", 5.99),
    ])
    expect(groups).toHaveLength(2)
  })
})
