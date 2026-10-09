import { deriveStage, paymentState, type Stage } from "./ship-orders"

/**
 * Aggregations behind the admin Dashboard charts. Pure (no Medusa imports) so
 * the numbers a business owner reads are unit-tested.
 *
 * "Sales" = the order total of every placed, non-canceled order — including
 * cash-on-delivery orders not yet collected. It is what customers committed to
 * buy, which is what a small shop watches day to day.
 */
export const STORE_TZ = process.env.STORE_TIMEZONE || "America/New_York"

export type StatOrder = {
  id: string
  created_at: string
  canceled_at?: string | null
  total: number
  items: { title: string; quantity: number; unitPrice: number }[]
  payment: "paid" | "cod" | "unpaid"
  stage: Stage
}

/** YYYY-MM-DD in the store's own timezone, so "today" matches the owner's day. */
export function dayKey(iso: string | Date, tz = STORE_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    typeof iso === "string" ? new Date(iso) : iso
  )
}

/** The last `days` calendar days ending today, oldest first. */
export function lastDays(days: number, now = new Date(), tz = STORE_TZ): string[] {
  const out: string[] = []
  for (let i = days - 1; i >= 0; i--) out.push(dayKey(new Date(now.getTime() - i * 86_400_000), tz))
  return out
}

export function toStatOrder(o: any): StatOrder {
  const items = ((o.items ?? []) as any[]).map((i) => ({
    title: i.product_title || i.title || "Item",
    quantity: Number(i.detail?.quantity ?? i.quantity ?? 0) || 0,
    unitPrice: Number(i.unit_price ?? 0) || 0,
  }))
  const lines = items.reduce((n, i) => n + i.quantity * i.unitPrice, 0)
  const shipping = ((o.shipping_methods ?? []) as any[]).reduce((n, m) => n + (Number(m.amount) || 0), 0)
  return {
    id: o.id,
    created_at: o.created_at,
    canceled_at: o.canceled_at ?? null,
    total: Number(o.summary?.current_order_total) || lines + shipping,
    items,
    payment: paymentState(o.payment_collections),
    stage: deriveStage(
      (o.items ?? []).map((i: any) => ({ id: i.id, quantity: i.detail?.quantity ?? i.quantity })),
      o.fulfillments ?? []
    ),
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100

export type DashboardStats = ReturnType<typeof buildStats>

export function buildStats(orders: StatOrder[], days: number, now = new Date(), tz = STORE_TZ) {
  const live = orders.filter((o) => !o.canceled_at)
  const keys = lastDays(days, now, tz)
  const prevKeys = new Set(lastDays(days * 2, now, tz).slice(0, days))
  const inWindow = new Set(keys)

  const daily = new Map(keys.map((k) => [k, { date: k, orders: 0, sales: 0 }]))
  let prevSales = 0
  let prevOrders = 0
  const products = new Map<string, { title: string; units: number; sales: number }>()

  for (const o of live) {
    const k = dayKey(o.created_at, tz)
    if (inWindow.has(k)) {
      const d = daily.get(k)!
      d.orders += 1
      d.sales += o.total
      for (const i of o.items) {
        const p = products.get(i.title) ?? { title: i.title, units: 0, sales: 0 }
        p.units += i.quantity
        p.sales += i.quantity * i.unitPrice
        products.set(i.title, p)
      }
    } else if (prevKeys.has(k)) {
      prevSales += o.total
      prevOrders += 1
    }
  }

  const series = [...daily.values()].map((d) => ({ ...d, sales: round2(d.sales) }))
  const sales = round2(series.reduce((n, d) => n + d.sales, 0))
  const count = series.reduce((n, d) => n + d.orders, 0)
  const delta = (cur: number, prev: number) => (prev > 0 ? Math.round(((cur - prev) / prev) * 1000) / 10 : null)

  const windowOrders = live.filter((o) => inWindow.has(dayKey(o.created_at, tz)))
  const pipeline: Record<Stage, number> = { to_ship: 0, label_ready: 0, shipped: 0, delivered: 0 }
  for (const o of live) pipeline[o.stage] += 1

  return {
    days,
    timezone: tz,
    totals: {
      sales,
      orders: count,
      avg_order: count ? round2(sales / count) : 0,
      units: [...products.values()].reduce((n, p) => n + p.units, 0),
      sales_change_pct: delta(sales, prevSales),
      orders_change_pct: delta(count, prevOrders),
    },
    daily: series,
    top_products: [...products.values()]
      .map((p) => ({ ...p, sales: round2(p.sales) }))
      .sort((a, b) => b.sales - a.sales || b.units - a.units)
      .slice(0, 8),
    pipeline,
    payment_mix: {
      card: windowOrders.filter((o) => o.payment === "paid").length,
      cod: windowOrders.filter((o) => o.payment === "cod").length,
      unpaid: windowOrders.filter((o) => o.payment === "unpaid").length,
    },
  }
}
