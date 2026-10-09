import { isSellable, unsellableItems } from "../catalog-visibility"

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
