"use client"

import { lookupOrder, TrackedOrder } from "@lib/data/orders"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import { useActionState } from "react"

const STEPS: { key: TrackedOrder["status"]; label: string }[] = [
  { key: "received", label: "Order received" },
  { key: "packed", label: "Packed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
]

const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null

function Timeline({ order }: { order: TrackedOrder }) {
  if (order.status === "canceled") {
    return <p className="font-semibold text-rose-700">This order was canceled.</p>
  }
  const reached = STEPS.findIndex((s) => s.key === order.status)
  const when: Record<string, string | null> = {
    received: fmt(order.placed_at),
    packed: fmt(order.fulfillments.find((f) => f.packed_at)?.packed_at),
    shipped: fmt(order.fulfillments.find((f) => f.shipped_at)?.shipped_at),
    delivered: fmt(order.fulfillments.find((f) => f.delivered_at)?.delivered_at),
  }
  return (
    <ol className="mt-4 space-y-3" data-testid="track-timeline">
      {STEPS.map((s, i) => (
        <li key={s.key} className="flex items-center gap-3">
          <span
            className={`h-4 w-4 rounded-full border-2 ${
              i <= reached ? "border-[#2E7D32] bg-[#2E7D32]" : "border-gray-300"
            }`}
          />
          <span className={i <= reached ? "font-medium" : "text-gray-400"}>{s.label}</span>
          {i <= reached && when[s.key] && (
            <span className="text-sm text-gray-500">{when[s.key]}</span>
          )}
        </li>
      ))}
    </ol>
  )
}

export default function TrackForm({ initialOrder = "" }: { initialOrder?: string }) {
  const [state, formAction] = useActionState(lookupOrder, null)
  const order = state?.order

  return (
    <div className="w-full max-w-md">
      <form action={formAction} className="flex flex-col gap-y-2">
        <Input label="Order number" name="order" defaultValue={initialOrder} required data-testid="track-order-input" />
        <Input label="Phone used at checkout" name="phone" type="tel" autoComplete="tel" required data-testid="track-phone-input" />
        {state?.error && (
          <p role="alert" className="text-small-regular text-rose-600" data-testid="track-error">
            {state.error}
          </p>
        )}
        <SubmitButton className="mt-4 w-full" data-testid="track-submit">
          Track order
        </SubmitButton>
      </form>

      {order && (
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6" data-testid="track-result">
          <p className="text-sm text-gray-500">Order</p>
          <p className="text-xl font-semibold">{order.number}</p>
          {order.ship_to && <p className="text-sm text-gray-600">Shipping to {order.ship_to}</p>}
          <Timeline order={order} />
          {order.fulfillments.flatMap((f) => f.tracking).length > 0 && (
            <div className="mt-6">
              <p className="font-medium">Tracking</p>
              <ul className="mt-1 list-disc pl-5">
                {order.fulfillments.flatMap((f) => f.tracking).map((t) => (
                  <li key={t.number}>
                    {t.url ? (
                      <a href={t.url} target="_blank" rel="noopener noreferrer" className="underline">
                        {t.number}
                      </a>
                    ) : (
                      t.number
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="mt-6 border-t pt-4 text-sm text-gray-700">
            {order.items.map((i, idx) => (
              <li key={idx}>
                {i.title} &times; {i.quantity}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
