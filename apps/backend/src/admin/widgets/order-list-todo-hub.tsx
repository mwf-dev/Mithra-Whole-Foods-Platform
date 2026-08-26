import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { CheckCircleSolid, Clock, ArrowPath } from "@medusajs/icons"
import { useEffect, useState } from "react"

type OrderActionItem = {
  id: string
  display_id: number
  email?: string
  created_at: string
  total: number
  currency_code: string
  itemsCount: number
  shippingMethod: string
  fulfillmentStatus: "needs_packing" | "ready_for_carrier" | "in_transit" | "delivered"
  trackingNumber?: string
  labelUrl?: string
}

const OrderListTodoHubWidget = () => {
  const [orders, setOrders] = useState<OrderActionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<"all_pending" | "needs_packing" | "ready_for_carrier">("needs_packing")

  useEffect(() => {
    async function loadOrders() {
      try {
        const res = await fetch("/admin/orders?limit=50&order=created_at&fields=id,display_id,email,created_at,total,currency_code,items.id,shipping_methods.name,fulfillments.id,fulfillments.packed_at,fulfillments.shipped_at,fulfillments.delivered_at,fulfillments.canceled_at,fulfillments.data,fulfillments.labels.*")
        if (!res.ok) return
        const data = await res.json()
        const rawList = data.orders || []

        const mapped: OrderActionItem[] = rawList.map((o: any) => {
          const activeFulfillments = (o.fulfillments || []).filter((f: any) => !f.canceled_at)
          let status: OrderActionItem["fulfillmentStatus"] = "needs_packing"
          let tracking = ""
          let label = ""

          if (activeFulfillments.length > 0) {
            const first = activeFulfillments[0]
            tracking = first.labels?.[0]?.tracking_number || first.data?.tracking_number || first.data?.easyship_shipment_id || ""
            label = first.labels?.[0]?.label_url || first.data?.label_url || ""

            if (first.delivered_at) {
              status = "delivered"
            } else if (first.shipped_at || tracking) {
              status = "ready_for_carrier"
            }
          }

          return {
            id: o.id,
            display_id: o.display_id,
            email: o.email,
            created_at: o.created_at,
            total: o.total,
            currency_code: o.currency_code,
            itemsCount: (o.items || []).length,
            shippingMethod: o.shipping_methods?.[0]?.name || "Standard Shipping",
            fulfillmentStatus: status,
            trackingNumber: tracking,
            labelUrl: label,
          }
        })

        setOrders(mapped)
      } catch (e) {
        console.error("Failed to load todo orders", e)
      } finally {
        setLoading(false)
      }
    }
    loadOrders()
  }, [])

  const needsPacking = orders.filter((o) => o.fulfillmentStatus === "needs_packing")
  const readyForCarrier = orders.filter((o) => o.fulfillmentStatus === "ready_for_carrier")
  const delivered = orders.filter((o) => o.fulfillmentStatus === "delivered")

  const displayedOrders = filter === "needs_packing"
    ? needsPacking
    : filter === "ready_for_carrier"
    ? readyForCarrier
    : [...needsPacking, ...readyForCarrier]

  const fmtTimeAgo = (iso: string) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (diff < 60) return `${diff}m ago`
    const hours = Math.floor(diff / 60)
    if (hours < 24) return `${hours}h ago`
    return `${Math.floor(hours / 24)}d ago`
  }

  return (
    <Container className="p-0 overflow-hidden mb-6 border border-gray-200 rounded-xl shadow-xs bg-white text-gray-900">
      {/* Header Banner */}
      <div className="p-5 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Heading level="h2" className="text-base font-bold text-gray-900">
            Daily Order Fulfillment & To-Do Queue
          </Heading>
          <Text className="text-xs text-gray-500 mt-0.5 font-medium">
            Prioritized FIFO order processing — fulfill older orders first to maintain prompt customer delivery.
          </Text>
        </div>

        {/* Action Counters */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilter("needs_packing")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${
              filter === "needs_packing"
                ? "bg-amber-100 border border-amber-300 text-amber-900 shadow-xs"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>Needs Packing</span>
            <span className="px-1.5 py-0.5 rounded text-[11px] bg-amber-200 text-amber-900 font-bold ml-0.5">{needsPacking.length}</span>
          </button>

          <button
            onClick={() => setFilter("ready_for_carrier")}
            className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${
              filter === "ready_for_carrier"
                ? "bg-blue-100 border border-blue-300 text-blue-900 shadow-xs"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Ready for Handover</span>
            <span className="px-1.5 py-0.5 rounded text-[11px] bg-blue-200 text-blue-900 font-bold ml-0.5">{readyForCarrier.length}</span>
          </button>

          <div className="px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-800">
            <span>Delivered</span>
            <span className="px-1.5 py-0.5 rounded text-[11px] bg-emerald-200 text-emerald-900 font-bold ml-0.5">{delivered.length}</span>
          </div>
        </div>
      </div>

      {/* Action Queue List */}
      <div className="p-4">
        {loading ? (
          <div className="py-8 text-center text-gray-500 text-sm font-medium animate-pulse">
            Loading active operational queue...
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="py-8 text-center bg-gray-50/60 rounded-xl border border-dashed border-gray-200">
            <CheckCircleSolid className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
            <Text className="text-sm font-bold text-gray-900">
              All caught up! No orders waiting in this queue.
            </Text>
            <Text className="text-xs text-gray-500 mt-0.5 font-medium">
              New customer orders will appear here automatically in order of arrival.
            </Text>
          </div>
        ) : (
          <div className="space-y-2.5">
            {displayedOrders.map((ord, idx) => (
              <div
                key={ord.id}
                className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all shadow-2xs"
              >
                {/* Order Identity & Time */}
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-700">
                    #{idx + 1}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">Order #{ord.display_id}</span>
                      <span className="text-xs text-gray-300">•</span>
                      <span className="text-xs text-gray-600 font-medium">{ord.email || "Customer"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5 font-medium">
                      <span>{ord.itemsCount} item{ord.itemsCount !== 1 ? "s" : ""}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-emerald-700 font-bold">
                        ${((ord.total || 0) / 100).toFixed(2)}
                      </span>
                      <span className="text-gray-300">•</span>
                      <span>{ord.shippingMethod}</span>
                      <span className="text-gray-300">•</span>
                      <span className="text-amber-800 font-bold">{fmtTimeAgo(ord.created_at)}</span>
                    </div>
                  </div>
                </div>

                {/* Priority Status & Action */}
                <div className="flex items-center gap-2">
                  {ord.fulfillmentStatus === "needs_packing" ? (
                    <>
                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                        Step 1: Pack & Label
                      </span>
                      <a href={`/app/orders/${ord.id}`}>
                        <Button size="small" variant="primary" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs">
                          Fulfill Order #{ord.display_id}
                        </Button>
                      </a>
                    </>
                  ) : (
                    <>
                      <span className="px-2.5 py-1 rounded text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                        Step 2: Handover ({ord.trackingNumber || "Ready"})
                      </span>
                      {ord.labelUrl && (
                        <a href={ord.labelUrl} target="_blank" rel="noopener noreferrer">
                          <Button size="small" variant="secondary" className="border-gray-300 text-gray-800 font-semibold text-xs">
                            Print Label
                          </Button>
                        </a>
                      )}
                      <a href={`/app/orders/${ord.id}`}>
                        <Button size="small" variant="transparent" className="text-gray-700 text-xs">
                          View Order →
                        </Button>
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.list.before",
})

export default OrderListTodoHubWidget
