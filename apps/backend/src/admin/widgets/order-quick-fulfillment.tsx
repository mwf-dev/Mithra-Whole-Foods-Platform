import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { Badge, Button, Container, Heading, Input, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

/**
 * Delivery panel on the order page. It talks to /admin/ship-orders/* (the same
 * rules as the Ship orders page): the packer first chooses courier or our own
 * delivery, then follows the steps for that choice.
 */
type Label = { tracking_number: string | null; tracking_url: string | null; label_url: string | null }
type Fulfillment = {
  id: string
  shipped_at: string | null
  delivered_at: string | null
  delivery_method: "courier" | "manual" | null
  driver: string | null
  note: string | null
  labels: Label[]
}
type Row = {
  id: string
  stage: "to_ship" | "label_ready" | "shipped" | "delivered"
  payment: "paid" | "cod" | "unpaid"
  can_fulfill: boolean
  block_reason: string | null
  fulfillments: Fulfillment[]
}

const STEPS = ["Choose delivery", "Pack", "Out for delivery", "Delivered"]
const STAGE_INDEX = { to_ship: 0, label_ready: 1, shipped: 2, delivered: 3 } as const

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.message || `Request failed (${res.status})`)
  return body
}

const OrderDeliveryWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const [row, setRow] = useState<Row | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<"courier" | "manual" | null>(null)
  const [driver, setDriver] = useState("")
  const [note, setNote] = useState("")
  const [tracking, setTracking] = useState("")
  const [notify, setNotify] = useState(true)

  const load = useCallback(async () => {
    try {
      const { order: r } = await api(`/admin/ship-orders/${order.id}`)
      setRow(r)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
  }, [order.id])

  useEffect(() => {
    load()
  }, [load])

  const run = async (path: string, body: unknown, ok: string) => {
    setBusy(true)
    try {
      const res = await api(`/admin/ship-orders/${order.id}/${path}`, { method: "POST", body: JSON.stringify(body) })
      toast.success(ok)
      setRow(res.order)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(false)
    }
  }

  const pack = (method: "courier" | "manual") => {
    if (method === "courier" && !window.confirm("Buy a shipping label for this order? This charges your Easyship account.")) {
      return
    }
    run("fulfill", { method, driver, note }, method === "courier" ? "Label bought" : "Packed for our own delivery")
  }

  const step = row ? STAGE_INDEX[row.stage] : 0
  const open = row?.fulfillments.find((f) => !f.shipped_at)
  const label = open?.labels.find((l) => l.tracking_number)
  const inTransit = row?.fulfillments.find((f) => f.shipped_at && !f.delivered_at)
  const doneLabels = (row?.fulfillments ?? []).flatMap((f) => f.labels).filter((l) => l.tracking_number)

  return (
    <Container className="mb-6 p-0 overflow-hidden">
      <div className="px-6 py-4 border-b border-ui-border-base">
        <Heading level="h2">Delivery</Heading>
        <Text size="small" className="text-ui-fg-subtle">Choose how this order goes out, then follow the steps.</Text>
      </div>

      <div className="flex gap-2 px-6 py-4 border-b border-ui-border-base">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${i <= step ? "bg-ui-fg-interactive" : "bg-ui-bg-component"}`} />
            <Text size="xsmall" weight={i === step ? "plus" : "regular"} className="mt-1">{i + 1}. {s}</Text>
          </div>
        ))}
      </div>

      <div className="px-6 py-5 flex flex-col gap-3">
        {error && <Text className="text-ui-fg-error">Couldn't load delivery details: {error}</Text>}
        {!row && !error && <Text className="text-ui-fg-subtle">Loading…</Text>}

        {row?.stage === "to_ship" && (
          <>
            <Text weight="plus">How will this order be delivered?</Text>
            <div className="grid gap-3 md:grid-cols-2">
              {([
                ["courier", "Courier partner (Easyship)", "We buy a label, print it, and hand the parcel to the courier. Tracking updates itself."],
                ["manual", "We deliver it ourselves", "Our own driver or customer pickup. You mark it out for delivery, then delivered."],
              ] as const).map(([key, title, sub]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMode(key)}
                  className={`rounded-lg border p-4 text-left ${
                    mode === key ? "border-ui-border-interactive bg-ui-bg-highlight" : "border-ui-border-base"
                  }`}
                >
                  <div className="text-sm font-semibold">{title}</div>
                  <div className="text-xs text-ui-fg-subtle mt-1">{sub}</div>
                </button>
              ))}
            </div>
            {mode === "courier" && (
              <div>
                <Button onClick={() => pack("courier")} isLoading={busy} disabled={!row.can_fulfill}>
                  Buy Easyship label &amp; pack
                </Button>
              </div>
            )}
            {mode === "manual" && (
              <div className="grid gap-2 md:max-w-md">
                <Input size="small" placeholder="Who delivers? (optional)" value={driver} onChange={(e) => setDriver(e.target.value)} />
                <Input size="small" placeholder="Note (e.g. leave at door)" value={note} onChange={(e) => setNote(e.target.value)} />
                <div>
                  <Button onClick={() => pack("manual")} isLoading={busy} disabled={!row.can_fulfill}>
                    Pack for our delivery
                  </Button>
                </div>
              </div>
            )}
            {row.block_reason && <Text size="small" className="text-ui-fg-error">{row.block_reason}</Text>}
          </>
        )}

        {row?.stage === "label_ready" && open && (
          <>
            <div className="flex items-center gap-2">
              <Badge color={open.delivery_method === "manual" ? "blue" : "green"}>
                {open.delivery_method === "manual" ? "Our own delivery" : "Courier"}
              </Badge>
              {open.driver && <Text size="small">Driver: {open.driver}</Text>}
            </div>
            {open.note && <Text size="small" className="text-ui-fg-subtle">{open.note}</Text>}
            <div className="flex flex-wrap gap-2">
              <a href={`/admin/ship-orders/print?type=invoice&ids=${order.id}&autoprint=1`} target="_blank" rel="noreferrer">
                <Button size="small" variant="secondary">Print invoice</Button>
              </a>
              <a href={`/admin/ship-orders/print?type=packing-slip&ids=${order.id}&autoprint=1`} target="_blank" rel="noreferrer">
                <Button size="small" variant="secondary">Print packing slip</Button>
              </a>
              {label?.label_url && (
                <a href={label.label_url} target="_blank" rel="noreferrer">
                  <Button size="small" variant="secondary">Print shipping label</Button>
                </a>
              )}
            </div>
            {open.delivery_method !== "manual" && (
              label ? (
                <Text size="small">Tracking: <span className="font-mono">{label.tracking_number}</span></Text>
              ) : (
                <Input size="small" className="md:max-w-sm" placeholder="Carrier tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} />
              )
            )}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
              Email the customer
            </label>
            <div>
              <Button
                isLoading={busy}
                disabled={open.delivery_method !== "manual" && !label && !tracking.trim()}
                onClick={() =>
                  run(
                    "ship",
                    { fulfillment_id: open.id, tracking_number: tracking || undefined, notify },
                    open.delivery_method === "manual" ? "Out for delivery" : "Handed to courier"
                  )
                }
              >
                {open.delivery_method === "manual" ? "Out for delivery" : "Handed to courier"}
              </Button>
            </div>
          </>
        )}

        {row?.stage === "shipped" && (
          <>
            {inTransit?.delivery_method === "manual" ? (
              <>
                <Text>Out for delivery{inTransit.driver ? ` with ${inTransit.driver}` : ""}.</Text>
                <div>
                  <Button isLoading={busy} onClick={() => run("deliver", { fulfillment_id: inTransit.id }, "Marked delivered")}>
                    Mark delivered
                  </Button>
                </div>
              </>
            ) : (
              <Text>With the courier. Delivered is updated automatically from Easyship tracking.</Text>
            )}
          </>
        )}

        {row?.stage === "delivered" && <Text>Delivered. Nothing more to do.</Text>}

        {(row?.stage === "shipped" || row?.stage === "delivered") &&
          doneLabels.map((l) => (
            <Text key={l.tracking_number!} size="small">
              Tracking:{" "}
              {l.tracking_url ? (
                <a className="font-mono underline" href={l.tracking_url} target="_blank" rel="noreferrer">{l.tracking_number}</a>
              ) : (
                <span className="font-mono">{l.tracking_number}</span>
              )}
            </Text>
          ))}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderDeliveryWidget
