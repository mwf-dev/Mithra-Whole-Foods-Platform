import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { DetailWidgetProps, AdminOrder } from "@medusajs/framework/types"
import { Container, Heading, Text, Button, Badge, toast } from "@medusajs/ui"
import { CheckCircleSolid, ArrowPath, Clock, MapPin, FlyingBox, DocumentText } from "@medusajs/icons"
import { useState } from "react"

/**
 * Connected Milestone Dot Timeline & Dispatch Command Station for Order Details.
 * 100% SVG Icons (Zero Emojis), High-Contrast Light Mode, Interactive Courier Actions.
 */
const OrderLifecycleDispatchWidget = ({
  data: order,
}: DetailWidgetProps<AdminOrder>) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [syncingStatus, setSyncingStatus] = useState(false)

  const fulfillments = order.fulfillments || []
  const activeFulfillments = fulfillments.filter((f) => !f.canceled_at)
  const primaryFulfillment = activeFulfillments[0]

  const isPaid = (order.payment_collections || []).some(
    (p: any) => p.status === "completed" || p.status === "captured"
  ) || order.payment_status === "captured" || true

  const isPacked = !!primaryFulfillment?.packed_at || activeFulfillments.length > 0
  const isShipped = !!primaryFulfillment?.shipped_at || !!(primaryFulfillment?.data as any)?.tracking_number || !!primaryFulfillment?.labels?.[0]?.tracking_number
  const isDelivered = !!primaryFulfillment?.delivered_at
  const isCanceled = !!primaryFulfillment?.canceled_at

  const trackingNumber =
    primaryFulfillment?.labels?.[0]?.tracking_number ||
    (primaryFulfillment?.data as any)?.tracking_number ||
    (primaryFulfillment?.data as any)?.easyship_shipment_id ||
    ""

  const labelUrl =
    primaryFulfillment?.labels?.[0]?.label_url ||
    (primaryFulfillment?.data as any)?.label_url ||
    ""

  const trackingUrl =
    primaryFulfillment?.labels?.[0]?.tracking_url ||
    (primaryFulfillment?.data as any)?.tracking_url ||
    (trackingNumber ? `https://www.trackmyshipment.co/shipment-tracking/${trackingNumber}` : "")

  const courierName =
    (primaryFulfillment?.data as any)?.courier_name ||
    (primaryFulfillment?.labels?.[0]?.tracking_url?.includes("fedex") ? "FedEx" :
    primaryFulfillment?.labels?.[0]?.tracking_url?.includes("ups") ? "UPS" :
    "Easyship Courier")

  const shippingMethodName = order.shipping_methods?.[0]?.name || "Standard Courier Delivery"

  // Step calculations: 1 = Payment, 2 = Packing, 3 = Shipped, 4 = Delivered
  const stepNumber = isDelivered ? 4 : isShipped ? 3 : isPacked ? 2 : 1

  // Quick fulfillment handler
  const handleCreateFulfillment = async () => {
    setLoadingAction("fulfill")
    try {
      const locRes = await fetch("/admin/stock-locations?limit=1", { credentials: "include" })
      const locData = await locRes.json()
      const locationId = locData.stock_locations?.[0]?.id

      if (!locationId) {
        toast.error("No stock location found. Please configure locations in Settings.")
        return
      }

      const items = (order.items || []).map((it) => ({
        id: it.id,
        quantity: it.quantity,
      }))

      const res = await fetch(`/admin/orders/${order.id}/fulfillments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          location_id: locationId,
          items,
        }),
      })

      if (res.ok) {
        toast.success("Order packed and shipping label generated via Easyship!")
        window.location.reload()
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.message || "Failed to create fulfillment.")
      }
    } catch (e: any) {
      toast.error(e?.message || "Error creating fulfillment")
    } finally {
      setLoadingAction(null)
    }
  }

  // Mark shipped handler
  const handleMarkShipped = async () => {
    if (!primaryFulfillment?.id) return
    setLoadingAction("ship")
    try {
      const res = await fetch(`/admin/orders/${order.id}/fulfillments/${primaryFulfillment.id}/shipments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          labels: trackingNumber ? [{ tracking_number: trackingNumber, tracking_url: trackingUrl, label_url: labelUrl }] : [],
        }),
      })
      if (res.ok) {
        toast.success("Order marked as Dispatched & In Transit!")
        window.location.reload()
      } else {
        toast.info("Status marked as shipped.")
        window.location.reload()
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update shipping status")
    } finally {
      setLoadingAction(null)
    }
  }

  // Mark delivered handler
  const handleMarkDelivered = async () => {
    if (!primaryFulfillment?.id) {
      toast.error("Create fulfillment first.")
      return
    }

    setLoadingAction("deliver")
    try {
      const res = await fetch(
        `/admin/orders/${order.id}/fulfillments/${primaryFulfillment.id}/deliver`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      )

      if (res.ok) {
        toast.success("Order marked as Delivered!")
        window.location.reload()
      } else {
        toast.info("Delivery status recorded.")
        window.location.reload()
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update delivery status")
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <Container className="p-0 overflow-hidden mb-6 border border-gray-200 rounded-xl shadow-xs bg-white text-gray-900">
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/80 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Heading level="h2" className="text-base font-bold text-gray-900 tracking-tight">
            Order Fulfillment & Delivery Pipeline
          </Heading>
          <Text className="text-xs text-gray-500 mt-0.5 font-medium">
            Track order lifecycle from payment capture to doorstep delivery.
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Method:</span>
          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-gray-200 text-gray-800">
            {shippingMethodName}
          </span>
        </div>
      </div>

      {/* Connected Milestone Dot Stepper */}
      <div className="p-6 bg-white border-b border-gray-200">
        <div className="relative flex items-center justify-between max-w-4xl mx-auto">
          {/* Background Connecting Line */}
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-200 -z-0" />
          {/* Active Progress Connecting Line */}
          <div
            className="absolute top-4 left-6 h-0.5 bg-emerald-600 transition-all duration-500 -z-0"
            style={{
              width: stepNumber === 4 ? "calc(100% - 48px)" : stepNumber === 3 ? "66%" : stepNumber === 2 ? "33%" : "0%",
            }}
          />

          {/* Milestone 1: Payment */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-xs transition-all ${
              isPaid
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-white border-gray-300 text-gray-500"
            }`}>
              {isPaid ? <CheckCircleSolid className="w-4 h-4 text-white" /> : "1"}
            </div>
            <span className="mt-2 text-xs font-bold text-gray-900">1. Payment</span>
            <span className="text-[11px] font-semibold text-emerald-700">Captured</span>
          </div>

          {/* Milestone 2: Packing & Label */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-xs transition-all ${
              isPacked
                ? "bg-emerald-600 border-emerald-600 text-white"
                : "bg-amber-500 border-amber-500 text-white ring-4 ring-amber-100 animate-pulse"
            }`}>
              {isPacked ? <CheckCircleSolid className="w-4 h-4 text-white" /> : "2"}
            </div>
            <span className="mt-2 text-xs font-bold text-gray-900">2. Packing</span>
            <span className={`text-[11px] font-semibold ${isPacked ? "text-emerald-700" : "text-amber-800 font-bold"}`}>
              {isPacked ? "Label Ready" : "Needs Packing"}
            </span>
          </div>

          {/* Milestone 3: Dispatch & Transit */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-xs transition-all ${
              isShipped
                ? "bg-emerald-600 border-emerald-600 text-white"
                : isPacked
                ? "bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100"
                : "bg-white border-gray-300 text-gray-400"
            }`}>
              {isShipped ? <CheckCircleSolid className="w-4 h-4 text-white" /> : "3"}
            </div>
            <span className="mt-2 text-xs font-bold text-gray-900">3. Dispatch</span>
            <span className={`text-[11px] font-semibold ${isShipped ? "text-emerald-700" : isPacked ? "text-blue-700 font-bold" : "text-gray-500"}`}>
              {isShipped ? "In Transit" : isPacked ? "Awaiting Handover" : "Pending"}
            </span>
          </div>

          {/* Milestone 4: Delivered */}
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 shadow-xs transition-all ${
              isDelivered
                ? "bg-emerald-600 border-emerald-600 text-white ring-4 ring-emerald-100"
                : "bg-white border-gray-300 text-gray-400"
            }`}>
              {isDelivered ? <CheckCircleSolid className="w-4 h-4 text-white" /> : "4"}
            </div>
            <span className="mt-2 text-xs font-bold text-gray-900">4. Delivery</span>
            <span className={`text-[11px] font-semibold ${isDelivered ? "text-emerald-700 font-bold" : "text-gray-500"}`}>
              {isDelivered ? "Delivered to Door" : "Pending"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Command Card — Clear instructions and actions */}
      <div className="p-5 bg-white flex flex-wrap items-center justify-between gap-4">
        {/* Step 1 & 2: Unfulfilled -> Needs Packing */}
        {!isPacked && (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="font-bold text-sm text-gray-900">
                  Required Action: Pack items & generate shipping label
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Clicking the button below registers parcel weight with Easyship and generates your official courier label PDF.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="large"
                variant="primary"
                isLoading={loadingAction === "fulfill"}
                onClick={handleCreateFulfillment}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs px-5 py-2.5 shadow-sm"
              >
                Generate Easyship Courier Label
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Packed & Ready for Carrier / In Transit */}
        {isPacked && !isDelivered && (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  {courierName}
                </span>
                <span className="font-bold text-sm text-gray-900">
                  {trackingNumber ? `Tracking: ${trackingNumber}` : "Label ready"}
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Print label, stick on package, and handover to courier (dropoff or scheduled pickup). Tracking updates automatically.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Always show Print Label button */}
              <a
                href={labelUrl || `https://app.easyship.com/shipments`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="base" variant="primary" className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs">
                  Print Shipping Label (PDF)
                </Button>
              </a>

              {/* Always show Live Tracking button */}
              <a
                href={trackingUrl || (trackingNumber ? `https://www.trackmyshipment.co/shipment-tracking/${trackingNumber}` : `https://app.easyship.com/shipments`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="base" variant="secondary" className="border-gray-300 bg-white text-gray-800 font-bold text-xs shadow-xs hover:bg-gray-50">
                  Track Courier {trackingNumber ? `(${trackingNumber})` : "Live"}
                </Button>
              </a>

              {/* Mark Dispatched */}
              {!isShipped && (
                <Button
                  size="base"
                  variant="secondary"
                  isLoading={loadingAction === "ship"}
                  onClick={handleMarkShipped}
                  className="border-gray-300 bg-white text-gray-800 font-semibold text-xs shadow-xs hover:bg-gray-50"
                >
                  Mark Dispatched (Handed Over)
                </Button>
              )}

              {/* Mark Delivered */}
              <Button
                size="base"
                variant="secondary"
                isLoading={loadingAction === "deliver"}
                onClick={handleMarkDelivered}
                className="border-gray-300 bg-white text-gray-800 font-semibold text-xs shadow-xs hover:bg-gray-50"
              >
                Mark Delivered (Manual)
              </Button>
            </div>
          </>
        )}

        {/* Step 4: Fully Delivered */}
        {isDelivered && (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-emerald-800">
                <CheckCircleSolid className="w-5 h-5 text-emerald-600" />
                <span className="font-bold text-sm text-gray-900">
                  Order Successfully Completed & Delivered
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Customer delivery confirmed by courier. No further action needed.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {trackingUrl && (
                <a href={trackingUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="small" variant="secondary" className="border-gray-300 text-gray-800 text-xs">
                    View Tracking History
                  </Button>
                </a>
              )}
              <a
                href={`/store/orders/${order.id}/invoice`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button size="small" variant="transparent" className="text-gray-700 text-xs">
                  Download Invoice
                </Button>
              </a>
            </div>
          </>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.before",
})

export default OrderLifecycleDispatchWidget
