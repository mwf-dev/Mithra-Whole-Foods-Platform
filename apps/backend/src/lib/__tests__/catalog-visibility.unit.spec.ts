import {
  isSellable,
  productIdsInCategoryBody,
  stripUnsellableFromCategoryBody,
  unsellableItems,
} from "../catalog-visibility"

describe("isSellable", () => {
  it("only published products are sellable", () => {
    expect(isSellable({ status: "published" })).toBe(true)
    expect(isSellable({ status: "draft" })).toBe(false)
    expect(isSellable({ status: "proposed" })).toBe(false)
    expect(isSellable(null)).toBe(false)
    expect(isSellable({})).toBe(false)
  })
})

describe("unsellableItems", () => {
  const status = new Map<string, string>([
    ["v_pub", "published"],
    ["v_draft", "draft"],
  ])
  const items = [
    { id: "1", variant_id: "v_pub" },
    { id: "2", variant_id: "v_draft" },
    { id: "3", variant_id: "v_deleted" },
    { id: "4", variant_id: null },
  ]
  it("flags hidden, deleted and variant-less items", () => {
    expect(unsellableItems(items, status).map((i) => i.id)).toEqual(["2", "3", "4"])
  })
  it("keeps everything when all are published", () => {
    expect(unsellableItems([items[0]], status)).toEqual([])
  })
})

describe("category response filtering", () => {
  const body = {
    product_categories: [
      {
        id: "c1",
        products: [{ id: "pub", title: "Live" }, { id: "hid", title: "Hidden" }],
        category_children: [{ id: "c2", products: [{ id: "hid" }, { id: "pub2" }] }],
        parent_category: { id: "c0", products: [{ id: "hid" }] },
      },
    ],
    count: 1,
  }
  it("collects ids from nested categories", () => {
    expect(productIdsInCategoryBody(body).sort()).toEqual(["hid", "pub", "pub2"])
    expect(productIdsInCategoryBody({ product_category: { products: [{ id: "x" }] } })).toEqual(["x"])
    expect(productIdsInCategoryBody({})).toEqual([])
  })
  it("strips hidden products everywhere, leaving the rest intact", () => {
    const out: any = stripUnsellableFromCategoryBody(body, new Set(["pub", "pub2"]))
    expect(out.product_categories[0].products).toEqual([{ id: "pub", title: "Live" }])
    expect(out.product_categories[0].category_children[0].products).toEqual([{ id: "pub2" }])
    expect(out.product_categories[0].parent_category.products).toEqual([])
    expect(out.count).toBe(1)
    expect(JSON.stringify(out)).not.toContain("hid")
  })
  it("leaves bodies without categories alone", () => {
    expect(stripUnsellableFromCategoryBody({ foo: 1 }, new Set())).toEqual({ foo: 1 })
  })
})
