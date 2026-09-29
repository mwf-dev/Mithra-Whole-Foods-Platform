import { retrieveOrder } from "@lib/data/orders"
import OrderCompletedTemplate from "@modules/order/templates/order-completed-template"
import TrackEvent from "@lib/analytics/track-event"
import { Metadata } from "next"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{ id: string }>
}
export const metadata: Metadata = {
  title: "Order Confirmed",
  description: "You purchase was successful",
}

export default async function OrderConfirmedPage(props: Props) {
  const params = await props.params
  const order = await retrieveOrder(params.id).catch(() => null)

  if (!order) {
    return notFound()
  }

  return (
    <>
      {/*
        Funnel completion only. The authoritative revenue event is emitted
        server-side from the backend `order-placed` subscriber, which cannot be
        blocked and does not depend on the shopper reaching this page.
        Deduplicate on `order_id` when reporting revenue.
      */}
      <TrackEvent
        name="order_completed"
        properties={{
          order_id: order.id,
          total: order.total ?? null,
          currency: order.currency_code,
          item_count:
            order.items?.reduce((acc, i) => acc + i.quantity, 0) ?? 0,
        }}
      />
      <OrderCompletedTemplate order={order} />
    </>
  )
}
