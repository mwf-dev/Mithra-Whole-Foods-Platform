import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import TrackEvent from "@lib/analytics/track-event"
import { Metadata } from "next"
import { notFound } from "next/navigation"
import { ORDERS_OPEN } from "@lib/launch"
import OrdersClosedNotice from "@modules/cart/components/orders-closed-notice"

export const metadata: Metadata = {
  title: "Checkout",
}

export default async function Checkout({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  await params

  // Before launch the form is never shown, even if someone types the URL.
  if (!ORDERS_OPEN) {
    return (
      <div className="content-container py-16 max-w-xl">
        <OrdersClosedNotice showShopLink />
      </div>
    )
  }

  // Fetch cart + customer in parallel — independent backend reads.
  const [cart, customer] = await Promise.all([
    retrieveCart(),
    retrieveCustomer(),
  ])

  if (!cart) {
    return notFound()
  }

  return (
    <div className="grid grid-cols-1 small:grid-cols-[1fr_416px] content-container gap-x-40 py-12">
      <TrackEvent
        name="checkout_started"
        properties={{
          cart_id: cart.id,
          item_count:
            cart.items?.reduce((acc, i) => acc + i.quantity, 0) ?? 0,
          subtotal: cart.subtotal ?? null,
          currency: cart.currency_code,
        }}
      />
      <PaymentWrapper cart={cart}>
        <CheckoutForm cart={cart} customer={customer} />
      </PaymentWrapper>
      <CheckoutSummary cart={cart} />
    </div>
  )
}
