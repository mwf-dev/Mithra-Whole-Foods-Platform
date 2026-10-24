import { defineRouteConfig } from "@medusajs/admin-sdk"
import { TruckFast } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Input, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"

type Stage = "to_ship" | "label_ready" | "shipped" | "delivered"

type Label = { tracking_number: string | null; tracking_url: string | null; label_url: string | null }
type TrackEvent = { status: string; at: string }
type Fulfillment = {
  id: string
  shipped_at: string | null
  delivered_at: string | null
  delivery_method: "courier" | "manual" | null
  driver: string | null
  note: string | null
  events: TrackEvent[]
  labels: Label[]
}

const STATUS_TEXT: Record<string, string> = {
  label_created: "Label created",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  exception: "Delivery problem",
  delivered: "Delivered",
}

function History({ events }: { events: TrackEvent[] }) {
  if (!events.length) return null
  return (
    <ul className="text-xs text-ui-fg-subtle">
      {events.map((e, i) => (
        <li key={i}>
          {STATUS_TEXT[e.status] ?? e.status} · {new Date(e.at).toLocaleString()}
        </li>
      ))}
    </ul>
  )
}
type Row = {
  id: string
  number: string
  placed_at: string
  stage: Stage
  customer: string
  email: string | null
  phone: string | null
  address: string
  items: { title: string; quantity: number }[]
  shipping_method: string | null
  auto_label: boolean
  payment: "paid" | "cod" | "unpaid"
  total: number
  currency: string
  missing: string[]
  can_fulfill: boolean
  block_reason: string | null
  fulfillments: Fulfillment[]
}

const TABS: { key: Stage; label: string; hint: string }[] = [
  { key: "to_ship", label: "To ship", hint: "Paid orders waiting to be packed." },
  { key: "label_ready", label: "Label ready", hint: "Packed. Print the label, hand it to the courier, then mark shipped." },
  { key: "shipped", label: "Shipped", hint: "On the way. Delivered is updated automatically." },
  { key: "delivered", label: "Delivered", hint: "Completed orders from the last 90 days." },
]

const money = (n: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: (currency || "usd").toUpperCase() }).format(n)

const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60) return `${Math.max(m, 0)}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

// Opens the print-ready page in a new tab; it brings up the print dialog itself.
const printUrl = (type: "packing-slip" | "invoice", ids: string[]) =>
  `/admin/ship-orders/print?type=${type}&ids=${ids.join(",")}&autoprint=1`

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.message || `Request failed (${res.status})`)
  return body
}

function OrderCard({ row, onChanged }: { row: Row; onChanged: (r: Row) => void }) {
  const [busy, setBusy] = useState(false)
  const [tracking, setTracking] = useState<Record<string, string>>({})
  const [notify, setNotify] = useState(true)
  const [driver, setDriver] = useState("")
  const [note, setNote] = useState("")
  const [mode, setMode] = useState<"courier" | "manual" | null>(null)

  const run = async (path: string, body: unknown, ok: string) => {
    setBusy(true)
    try {
      const res = await api(`/admin/ship-orders/${row.id}/${path}`, { method: "POST", body: JSON.stringify(body) })
      toast.success(ok)
      onChanged(res.order)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const fulfill = (method: "courier" | "manual") => {
    if (
      method === "courier" &&
      !window.confirm(`Buy a shipping label for ${row.number}? This charges your Easyship account.`)
    ) {
      return
    }
    run("fulfill", { method, driver, note }, method === "courier" ? "Label bought" : "Packed for manual delivery")
  }

  const openFulfillments = row.fulfillments.filter((f) => !f.shipped_at)

  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Text className="text-base font-semibold">{row.number}</Text>
            <Badge size="2xsmall" color={row.payment === "paid" ? "green" : row.payment === "cod" ? "blue" : "red"}>
              {row.payment === "paid" ? "Paid" : row.payment === "cod" ? "Pay on delivery" : "Unpaid"}
            </Badge>
            {row.shipping_method && (
              <Badge size="2xsmall" color="grey">
                {row.shipping_method}
              </Badge>
            )}
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            {ago(row.placed_at)} · {money(row.total, row.currency)}
          </Text>
        </div>
        <div className="flex gap-2">
          <a href={printUrl("packing-slip", [row.id])} target="_blank" rel="noreferrer">
            <Button size="small" variant="secondary">Packing slip</Button>
          </a>
          <a href={printUrl("invoice", [row.id])} target="_blank" rel="noreferrer">
            <Button size="small" variant="secondary">Invoice</Button>
          </a>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <Text size="small" weight="plus">Ship to</Text>
          <Text size="small">{row.customer}</Text>
          <Text size="small" className="text-ui-fg-subtle">{row.address}</Text>
          <Text size="small" className="text-ui-fg-subtle">{row.phone ?? "No phone"} · {row.email ?? "No email"}</Text>
        </div>
        <div>
          <Text size="small" weight="plus">Pack</Text>
          <ul className="mt-0.5">
            {row.items.map((i, idx) => (
              <li key={idx} className="text-sm">
                <span className="font-semibold">{i.quantity} ×</span> {i.title}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          {row.stage === "to_ship" && (
            <>
              <Text size="small" weight="plus">How will this order be delivered?</Text>
              <div className="grid grid-cols-2 gap-2">
                {([
                  ["courier", "Courier partner", "Buy a label, hand to the courier"],
                  ["manual", "We deliver", "Our own driver or pickup"],
                ] as const).map(([key, title, sub]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setMode(key)}
                    className={`rounded-lg border p-3 text-left ${
                      mode === key ? "border-ui-border-interactive bg-ui-bg-highlight" : "border-ui-border-base"
                    }`}
                  >
                    <div className="text-sm font-semibold">{title}</div>
                    <div className="text-xs text-ui-fg-subtle">{sub}</div>
                  </button>
                ))}
              </div>
              {mode === "courier" && (
                <Button onClick={() => fulfill("courier")} isLoading={busy} disabled={!row.can_fulfill}>
                  Buy label &amp; pack
                </Button>
              )}
              {mode === "manual" && (
                <>
                  <Input
                    size="small"
                    placeholder="Who delivers? (optional)"
                    value={driver}
                    onChange={(e) => setDriver(e.target.value)}
                  />
                  <Input
                    size="small"
                    placeholder="Note (e.g. leave at door)"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                  <Button onClick={() => fulfill("manual")} isLoading={busy} disabled={!row.can_fulfill}>
                    Pack for our delivery
                  </Button>
                </>
              )}
              {row.block_reason && <Text size="small" className="text-ui-fg-error">{row.block_reason}</Text>}
            </>
          )}

          {row.stage === "label_ready" &&
            openFulfillments.map((f) => {
              const label = f.labels.find((l) => l.tracking_number)
              const manual = f.delivery_method === "manual"
              if (manual) {
                return (
                  <div key={f.id} className="flex flex-col gap-2">
                    <Badge size="2xsmall" color="blue">Manual delivery</Badge>
                    {f.driver && <Text size="small">Driver: {f.driver}</Text>}
                    {f.note && <Text size="small" className="text-ui-fg-subtle">{f.note}</Text>}
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                      Email the customer
                    </label>
                    <Button isLoading={busy} onClick={() => run("ship", { fulfillment_id: f.id, notify }, "Out for delivery")}>
                      Out for delivery
                    </Button>
                  </div>
                )
              }
              return (
                <div key={f.id} className="flex flex-col gap-2">
                  {label?.label_url && (
                    <a href={label.label_url} target="_blank" rel="noreferrer">
                      <Button variant="secondary" className="w-full">Print label</Button>
                    </a>
                  )}
                  {label ? (
                    <Text size="small">Tracking: <span className="font-mono">{label.tracking_number}</span></Text>
                  ) : (
                    <Input
                      size="small"
                      placeholder="Carrier tracking number"
                      value={tracking[f.id] ?? ""}
                      onChange={(e) => setTracking((t) => ({ ...t, [f.id]: e.target.value }))}
                    />
                  )}
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                    Email the customer
                  </label>
                  <Button
                    isLoading={busy}
                    disabled={!label && !(tracking[f.id] ?? "").trim()}
                    onClick={() =>
                      run(
                        "ship",
                        { fulfillment_id: f.id, tracking_number: tracking[f.id], notify },
                        notify ? "Marked shipped — customer emailed" : "Marked shipped"
                      )
                    }
                  >
                    Mark as shipped
                  </Button>
                </div>
              )
            })}

          {row.stage === "shipped" &&
            row.fulfillments
              .filter((f) => f.delivery_method === "manual" && f.shipped_at && !f.delivered_at)
              .map((f) => (
                <Button key={f.id} isLoading={busy} onClick={() => run("deliver", { fulfillment_id: f.id }, "Marked delivered")}>
                  Mark delivered
                </Button>
              ))}

          {row.stage === "shipped" && row.fulfillments.some((f) => f.delivery_method === "courier") && (
            <Button size="small" variant="secondary" isLoading={busy} onClick={() => run("refresh", {}, "Checked with Easyship")}>
              Check courier status now
            </Button>
          )}

          {(row.stage === "shipped" || row.stage === "delivered") &&
            row.fulfillments.flatMap((f) => f.labels).filter((l) => l.tracking_number).map((l) => (
              <Text key={l.tracking_number!} size="small">
                Tracking:{" "}
                {l.tracking_url ? (
                  <a className="font-mono underline" href={l.tracking_url} target="_blank" rel="noreferrer">
                    {l.tracking_number}
                  </a>
                ) : (
                  <span className="font-mono">{l.tracking_number}</span>
                )}
              </Text>
            ))}
          {row.fulfillments.map((f) => (
            <History key={f.id} events={f.events} />
          ))}
        </div>
      </div>
    </div>
  )
}

const ShipOrdersPage = () => {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<Stage>("to_ship")
  const [picked, setPicked] = useState(false)

  const load = useCallback(async () => {
    try {
      const { orders } = await api("/admin/ship-orders")
      setRows(orders)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

  const counts = useMemo(() => {
    const c: Record<Stage, number> = { to_ship: 0, label_ready: 0, shipped: 0, delivered: 0 }
    for (const r of rows ?? []) c[r.stage]++
    return c
  }, [rows])

  // Land on the first tab that has work, unless the packer already chose one.
  useEffect(() => {
    if (!rows || picked) return
    const first = (["to_ship", "label_ready"] as Stage[]).find((s) => counts[s] > 0)
    if (first) setTab(first)
  }, [rows, counts, picked])

  const visible = (rows ?? []).filter((r) => r.stage === tab)
  const hint = TABS.find((t) => t.key === tab)?.hint

  const replace = (updated: Row) =>
    setRows((rs) => (rs ?? []).map((r) => (r.id === updated.id ? updated : r)))

  return (
    <Container className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div>
          <Heading level="h1">Ship orders</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Pack, get the label, hand it to the courier, mark shipped. That's it.
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={load}>Refresh</Button>
      </div>

      <div className="flex flex-wrap gap-2 border-y border-ui-border-base px-6 py-3">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="small"
            variant={tab === t.key ? "primary" : "secondary"}
            onClick={() => {
              setTab(t.key)
              setPicked(true)
            }}
          >
            {t.label} ({counts[t.key]})
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-4 px-6 py-5">
        {hint && <Text size="small" className="text-ui-fg-subtle">{hint}</Text>}
        {tab === "to_ship" && visible.length > 0 && (
          <div>
            <a href={printUrl("packing-slip", visible.slice(0, 50).map((r) => r.id))} target="_blank" rel="noreferrer">
              <Button size="small" variant="secondary">
                Print all {Math.min(visible.length, 50)} packing slip{visible.length === 1 ? "" : "s"}
              </Button>
            </a>
          </div>
        )}
        {error && <Text className="text-ui-fg-error">Couldn't load orders: {error}</Text>}
        {!rows && !error && <Text className="text-ui-fg-subtle">Loading…</Text>}
        {rows && visible.length === 0 && <Text className="text-ui-fg-subtle">Nothing here.</Text>}
        {visible.map((r) => (
          <OrderCard key={r.id} row={r} onChanged={replace} />
        ))}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Ship orders",
  icon: TruckFast,
})

export default ShipOrdersPage
