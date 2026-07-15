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
  payment_status: string
  fulfillment_status: string
}

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

// Medusa status → Badge color
const statusColor = (s: string): "green" | "orange" | "red" | "grey" => {
  if (["captured", "fulfilled", "completed"].includes(s)) return "green"
  if (["not_fulfilled", "awaiting", "not_paid"].includes(s)) return "orange"
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
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const orderFields =
      "fields=id,display_id,email,created_at,total,currency_code,payment_status,fulfillment_status"

    Promise.all([
      getJson(`/admin/orders?limit=8&order=-created_at&${orderFields}`),
      getJson(
        `/admin/orders?limit=200&created_at[$gte]=${monthStart.toISOString()}&fields=total,currency_code`
      ),
      getJson(
        `/admin/orders?limit=1&fulfillment_status[]=not_fulfilled&fields=id`
      ),
      getJson(`/admin/products?limit=1&fields=id`),
    ])
      .then(([recent, month, unfulfilled, products]) => {
        const monthOrders = month.orders ?? []
        setStats({
          recent: recent.orders ?? [],
          ordersThisMonth: monthOrders.length,
          revenueThisMonth: monthOrders.reduce(
            (sum: number, o: any) => sum + (o.total ?? 0),
            0
          ),
          awaitingFulfillment: unfulfilled.count ?? 0,
          totalProducts: products.count ?? 0,
          currency: (recent.orders?.[0]?.currency_code ||
            monthOrders[0]?.currency_code ||
            "usd") as string,
        })
      })
      .catch((e) => setError(e.message))
  }, [])

  const cards = stats
    ? [
        {
          label: "Revenue · this month",
          value: money(stats.revenueThisMonth, stats.currency),
        },
        { label: "Orders · this month", value: String(stats.ordersThisMonth) },
        {
          label: "Awaiting fulfillment",
          value: String(stats.awaitingFulfillment),
          highlight: stats.awaitingFulfillment > 0,
        },
        { label: "Products", value: String(stats.totalProducts) },
      ]
    : []

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Dashboard</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Your store at a glance
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={() => location.reload()}>
          Refresh
        </Button>
      </div>

      {error && (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">Couldn’t load dashboard: {error}</Text>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 p-6 lg:grid-cols-4">
        {(stats ? cards : Array.from({ length: 4 })).map((c: any, i) => (
          <div
            key={i}
            className={`rounded-lg border p-4 ${
              c?.highlight
                ? "border-ui-tag-orange-border bg-ui-tag-orange-bg"
                : "border-ui-border-base bg-ui-bg-subtle"
            }`}
          >
            <Text size="small" className="text-ui-fg-subtle">
              {c?.label ?? "…"}
            </Text>
            <Heading level="h2" className="mt-1">
              {c?.value ?? "—"}
            </Heading>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="px-6 py-4">
        <div className="mb-2 flex items-center justify-between">
          <Heading level="h2">Recent orders</Heading>
          <a href="/app/orders" className="text-ui-fg-interactive text-sm">
            View all
          </a>
        </div>
        {stats && stats.recent.length === 0 ? (
          <Text className="text-ui-fg-subtle py-6">No orders yet.</Text>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Order</Table.HeaderCell>
                <Table.HeaderCell>Date</Table.HeaderCell>
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
                  className="cursor-pointer"
                  onClick={() => (location.href = `/app/orders/${o.id}`)}
                >
                  <Table.Cell>#{o.display_id}</Table.Cell>
                  <Table.Cell>{fmtDate(o.created_at)}</Table.Cell>
                  <Table.Cell>{o.email ?? "—"}</Table.Cell>
                  <Table.Cell>
                    <Badge size="2xsmall" color={statusColor(o.payment_status)}>
                      {o.payment_status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>
                    <Badge
                      size="2xsmall"
                      color={statusColor(o.fulfillment_status)}
                    >
                      {o.fulfillment_status}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell className="text-right">
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
