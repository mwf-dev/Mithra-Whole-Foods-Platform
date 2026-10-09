import { buildStats, dayKey, lastDays, toStatOrder, type StatOrder } from "../dashboard-stats"

const TZ = "America/New_York"
const now = new Date("2026-10-10T16:00:00Z") // noon in New York

const order = (iso: string, total: number, over: Partial<StatOrder> = {}): StatOrder => ({
  id: iso + total,
  created_at: iso,
  total,
  items: [{ title: "Sea Salt", quantity: 1, unitPrice: total }],
  payment: "paid",
  stage: "to_ship",
  ...over,
})

describe("dayKey", () => {
  it("uses the store's calendar day, not UTC", () => {
    // 02:30 UTC on the 10th is still the evening of the 9th in New York.
    expect(dayKey("2026-10-10T02:30:00Z", TZ)).toBe("2026-10-09")
    expect(dayKey("2026-10-10T16:00:00Z", TZ)).toBe("2026-10-10")
  })
})

describe("lastDays", () => {
  it("returns N consecutive days ending today, oldest first", () => {
    const d = lastDays(3, now, TZ)
    expect(d).toEqual(["2026-10-08", "2026-10-09", "2026-10-10"])
  })
})

describe("buildStats", () => {
  const orders = [
    order("2026-10-10T15:00:00Z", 30),
    order("2026-10-10T14:00:00Z", 20, { payment: "cod" }),
    order("2026-10-09T15:00:00Z", 50, { stage: "delivered" }),
    order("2026-10-08T15:00:00Z", 999, { canceled_at: "2026-10-08T16:00:00Z" } as any),
    order("2026-10-05T15:00:00Z", 40), // previous period when days=3 (window 8-10; prev 5-7)
  ]
  const s = buildStats(orders, 3, now, TZ)

  it("zero-fills every day and excludes canceled orders", () => {
    expect(s.daily.map((d) => [d.date, d.orders, d.sales])).toEqual([
      ["2026-10-08", 0, 0],
      ["2026-10-09", 1, 50],
      ["2026-10-10", 2, 50],
    ])
  })
  it("totals, average and change vs the previous period", () => {
    expect(s.totals).toMatchObject({ sales: 100, orders: 3, avg_order: 33.33, sales_change_pct: 150, orders_change_pct: 200 })
  })
  it("ranks products and counts the pipeline and payment mix", () => {
    expect(s.top_products[0]).toMatchObject({ title: "Sea Salt", units: 3, sales: 100 })
    expect(s.pipeline.to_ship).toBe(3) // canceled one is not counted
    expect(s.pipeline.delivered).toBe(1)
    expect(s.payment_mix).toEqual({ card: 2, cod: 1, unpaid: 0 })
  })
  it("reports null change when the previous period had no sales", () => {
    expect(buildStats([order("2026-10-10T15:00:00Z", 10)], 3, now, TZ).totals.sales_change_pct).toBeNull()
  })
})

describe("toStatOrder", () => {
  it("reads quantity from detail and falls back to lines + shipping", () => {
    const o = toStatOrder({
      id: "o1",
      created_at: "2026-10-10T15:00:00Z",
      items: [{ id: "li", unit_price: 5, quantity: null, detail: { quantity: 2 }, product_title: "Salt" }],
      shipping_methods: [{ amount: 10 }],
      payment_collections: [],
      fulfillments: [],
    })
    expect(o.items[0].quantity).toBe(2)
    expect(o.total).toBe(20)
    expect(o.stage).toBe("to_ship")
    expect(o.payment).toBe("unpaid")
  })
})
