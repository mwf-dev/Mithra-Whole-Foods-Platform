import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChartBar } from "@medusajs/icons"
import {
  Container,
  Heading,
  Text,
  Badge,
  Table,
  Button,
} from "@medusajs/ui"
import { useEffect, useState } from "react"

type OrderRow = {
  id: string
  display_id: number
  email?: string
  created_at: string
  total: number
  currency_code: string
  // Derived on the client from the fulfillment/payment relations below,
  // because the admin API returns the aggregated *_status fields empty when
  // a narrow `fields=` selection omits those relations.
  paymentLabel: string
  fulfillmentLabel: string
}

type RawOrder = {
  id: string
  display_id: number
  email?: string
  created_at: string
  total: number
  currency_code: string
  fulfillments?: {
    packed_at?: string | null
    shipped_at?: string | null
    delivered_at?: string | null
    canceled_at?: string | null
  }[]
  payment_collections?: { status?: string }[]
}

// Derive the fulfillment badge from the actual fulfillment records.
const fulfillmentLabelOf = (o: RawOrder): string => {
  const active = (o.fulfillments ?? []).filter((f) => !f.canceled_at)
  if (active.length === 0) return "not fulfilled"
  if (active.some((f) => f.delivered_at)) return "delivered"
  if (active.some((f) => f.shipped_at)) return "shipped"
  return "fulfilled"
}

// Derive the payment badge from the order's payment collections. Medusa marks
// a fully-paid collection as "completed" (or "captured").
const paymentLabelOf = (o: RawOrder): string => {
  const statuses = (o.payment_collections ?? []).map((p) => p.status || "")
  if (statuses.some((s) => s === "completed" || s === "captured")) return "paid"
  if (statuses.includes("partially_captured")) return "partially paid"
  if (statuses.some((s) => s.includes("authorized"))) return "authorized"
  if (statuses.includes("awaiting")) return "awaiting"
  return "not paid"
}

const toRow = (o: RawOrder): OrderRow => ({
  id: o.id,
  display_id: o.display_id,
  email: o.email,
  created_at: o.created_at,
  total: o.total,
  currency_code: o.currency_code,
  paymentLabel: paymentLabelOf(o),
  fulfillmentLabel: fulfillmentLabelOf(o),
})

type Stats = {
  ordersThisMonth: number
  revenueThisMonth: number
  awaitingFulfillment: number
  totalProducts: number
  currency: string
  recent: OrderRow[]
}

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(amount || 0)

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

// Status label → Badge color
const statusColor = (s: string): "green" | "orange" | "red" | "grey" => {
  if (["paid", "fulfilled", "shipped", "delivered", "completed"].includes(s))
    return "green"
  if (
    ["not fulfilled", "not paid", "awaiting", "authorized", "partially paid"].includes(
      s
    )
  )
    return "orange"
  if (["canceled", "requires_action"].includes(s)) return "red"
  return "grey"
}

async function getJson(url: string): Promise<any> {
  try {
    const res = await fetch(url, { credentials: "include" })
    if (!res.ok) return {}
    return await res.json()
  } catch {
    // One failing query (e.g. an unsupported filter) shouldn't blank the
    // whole dashboard — degrade that metric instead.
    return {}
  }
}

const DashboardPage = () => {
  const [stats, setStats] = useState<Stats | null>(null)
  const [unfulfilledOrders, setUnfulfilledOrders] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const orderFields =
      "fields=id,display_id,email,created_at,total,currency_code,shipping_methods.name," +
      "fulfillments.packed_at,fulfillments.shipped_at,fulfillments.delivered_at," +
      "fulfillments.canceled_at,fulfillments.data,fulfillments.labels.*,payment_collections.status"

    Promise.all([
      getJson(`/admin/orders?limit=200&order=created_at&${orderFields}`),
      getJson(`/admin/products?limit=1&fields=id`),
    ])
      .then(([all, products]) => {
        const rawOrders: RawOrder[] = all.orders ?? []
        const rows = rawOrders.map(toRow)
        const monthRows = rows.filter(
          (r) => new Date(r.created_at) >= monthStart
        )

        const unfulfilled = rawOrders.filter((o) => {
          const active = (o.fulfillments ?? []).filter((f) => !f.canceled_at)
          return active.length === 0 || (!active.some((f) => f.delivered_at) && !active.some((f) => f.shipped_at))
        })

        setUnfulfilledOrders(unfulfilled)
        setStats({
          recent: [...rows].reverse().slice(0, 10),
          ordersThisMonth: monthRows.length,
          revenueThisMonth: monthRows.reduce((sum, o) => sum + (o.total ?? 0), 0),
          awaitingFulfillment: unfulfilled.length,
          totalProducts: products.count ?? 0,
          currency: (rows[0]?.currency_code || "usd") as string,
        })
      })
      .catch((e) => setError(e.message))
  }, [])

  const fmtTimeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 60) return `${diff}m ago`
    const hours = Math.floor(diff / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <Container className="divide-y p-0 border border-ui-border-base rounded-2xl shadow-sm bg-ui-bg-base overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-5 bg-gradient-to-r from-ui-bg-subtle via-ui-bg-base to-ui-bg-subtle">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🌿</span>
            <Heading level="h1" className="text-xl font-bold">
              Operations & Daily Dispatch Hub
            </Heading>
          </div>
          <Text className="text-ui-fg-subtle text-xs mt-1">
            Real-time store overview, FIFO dispatch queue, and fulfillment tracking.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button size="small" variant="secondary" onClick={() => location.reload()}>
            🔄 Refresh Live Data
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 bg-ui-tag-red-bg border-b border-ui-tag-red-border">
          <Text className="text-ui-fg-error font-medium">Couldn’t load dashboard: {error}</Text>
        </div>
      )}

      {/* Primary KPI Tiles */}
      <div className="grid grid-cols-2 gap-4 p-6 lg:grid-cols-4 bg-ui-bg-subtle/30">
        <div className={`rounded-xl border p-4 transition-all ${
          (stats?.awaitingFulfillment ?? 0) > 0
            ? "border-amber-500/40 bg-amber-500/10 shadow-xs"
            : "border-ui-border-base bg-ui-bg-subtle"
        }`}>
          <div className="flex items-center justify-between">
            <Text size="small" className="text-ui-fg-subtle font-medium">
              ⏳ Awaiting Packing
            </Text>
            {(stats?.awaitingFulfillment ?? 0) > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </div>
          <Heading level="h1" className="text-2xl font-black mt-2 text-ui-fg-base">
            {stats ? String(stats.awaitingFulfillment) : "—"}
          </Heading>
          <Text className="text-xs text-ui-fg-muted mt-1">
            {(stats?.awaitingFulfillment ?? 0) > 0
              ? "Action needed: Pack & Label"
              : "All current orders packed!"}
          </Text>
        </div>

        <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4">
          <Text size="small" className="text-ui-fg-subtle font-medium">
            💰 Revenue · This Month
          </Text>
          <Heading level="h1" className="text-2xl font-black mt-2 text-emerald-400">
            {stats ? money(stats.revenueThisMonth, stats.currency) : "—"}
          </Heading>
          <Text className="text-xs text-ui-fg-muted mt-1">
            Paid & captured orders
          </Text>
        </div>

        <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4">
          <Text size="small" className="text-ui-fg-subtle font-medium">
            📦 Orders · This Month
          </Text>
          <Heading level="h1" className="text-2xl font-black mt-2 text-ui-fg-base">
            {stats ? String(stats.ordersThisMonth) : "—"}
          </Heading>
          <Text className="text-xs text-ui-fg-muted mt-1">
            Total store volume
          </Text>
        </div>

        <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4">
          <Text size="small" className="text-ui-fg-subtle font-medium">
            🏷️ Live Products
          </Text>
          <Heading level="h1" className="text-2xl font-black mt-2 text-ui-fg-base">
            {stats ? String(stats.totalProducts) : "—"}
          </Heading>
          <Text className="text-xs text-ui-fg-muted mt-1">
            Active catalog items
          </Text>
        </div>
      </div>

      {/* Priority Action To-Do List (FIFO: Oldest Pending Orders) */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <Heading level="h2" className="text-base font-bold flex items-center gap-2">
              <span>📋</span> Priority Dispatch Queue (Oldest Orders First)
            </Heading>
            <Text className="text-xs text-ui-fg-muted mt-0.5">
              Fulfill these orders first to ensure timely customer delivery.
            </Text>
          </div>
          <a href="/app/orders">
            <Button size="small" variant="secondary">
              Open Full Orders List →
            </Button>
          </a>
        </div>

        {unfulfilledOrders.length === 0 ? (
          <div className="py-6 text-center bg-ui-bg-subtle/50 rounded-xl border border-dashed border-ui-border-base">
            <span className="text-xl mb-1 block">✅</span>
            <Text className="text-sm font-semibold text-ui-fg-base">
              Dispatch queue is completely clear!
            </Text>
            <Text className="text-xs text-ui-fg-muted mt-0.5">
              All incoming customer orders have been packed.
            </Text>
          </div>
        ) : (
          <div className="space-y-2.5">
            {unfulfilledOrders.slice(0, 6).map((ord, idx) => (
              <div
                key={ord.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:border-amber-500/60 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-300">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ui-fg-base">Order #{ord.display_id}</span>
                      <span className="text-xs text-ui-fg-muted">•</span>
                      <span className="text-xs text-ui-fg-subtle">{ord.email || "Customer"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-ui-fg-muted mt-0.5">
                      <span className="text-emerald-400 font-semibold">${((ord.total || 0) / 100).toFixed(2)}</span>
                      <span>•</span>
                      <span>{ord.shipping_methods?.[0]?.name || "Standard Shipping"}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-medium">Placed {fmtTimeAgo(ord.created_at)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge color="orange" className="text-xs font-semibold">
                    Needs Fulfillment
                  </Badge>
                  <a href={`/app/orders/${ord.id}`}>
                    <Button size="small" variant="primary" className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold">
                      ⚡ Fulfill Order #{ord.display_id}
                    </Button>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Table */}
      <div className="p-6">
        <div className="mb-3 flex items-center justify-between">
          <Heading level="h2" className="text-base font-bold">
            Recent Orders & History
          </Heading>
          <a href="/app/orders" className="text-ui-fg-interactive text-xs font-medium hover:underline">
            View all orders →
          </a>
        </div>
        {stats && stats.recent.length === 0 ? (
          <Text className="text-ui-fg-subtle py-6 text-center text-sm">No recent orders.</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Order</Table.HeaderCell>
                <Table.HeaderCell>Placed</Table.HeaderCell>
                <Table.HeaderCell>Customer</Table.HeaderCell>
                <Table.HeaderCell>Payment</Table.HeaderCell>
                <Table.HeaderCell>Fulfillment</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Total</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {(stats?.recent ?? []).map((o) => (
                <Table.Row
                  key={o.id}
                  className="cursor-pointer hover:bg-ui-bg-subtle"
                  onClick={() => (location.href = `/app/orders/${o.id}`)}
                >
                  <Table.Cell className="font-bold">#{o.display_id}</Table.Cell>
                  <Table.Cell>{fmtDate(o.created_at)}</Table.Cell>
                  <Table.Cell>{o.email ?? "—"}</Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={statusColor(o.paymentLabel)}>
                      {o.paymentLabel}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={statusColor(o.fulfillmentLabel)}>
                      {o.fulfillmentLabel}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-right font-medium text-emerald-400">
                    {money(o.total, o.currency_code)}
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Dashboard",
  icon: ChartBar,
})

export default DashboardPage
