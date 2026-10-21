import { Metadata } from "next"
import { Suspense } from "react"

import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getHomepageSettings } from "@lib/data/homepage"
import { getBaseURL } from "@lib/util/env"
import { CartProvider } from "@lib/context/cart-context"
import { CustomerProvider } from "@lib/context/customer-context"
import { AnalyticsIdentify } from "@lib/analytics/provider"
import { StoreCartShippingOption } from "@medusajs/types"
import { AnnouncementBar } from "@modules/home/components/announcement-bar"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import LaunchBanner from "@modules/layout/components/launch-banner"
import Chatbot from "@modules/layout/components/chatbot"
import WelcomePopup from "@modules/layout/components/welcome-popup"
import { buildWelcomeCards } from "@modules/layout/components/welcome-popup/cards"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import RouteTransitionOverlay from "@modules/layout/components/route-transition-overlay"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode }) {
  const [customer, cart, homepageSettings] = await Promise.all([
    retrieveCustomer(),
    retrieveCart(),
    getHomepageSettings(),
  ])
  let shippingOptions: StoreCartShippingOption[] = []

  if (cart) {
    const { shipping_options } = await listCartOptions()

    shippingOptions = shipping_options
  }

  return (
    <CartProvider initialCart={cart}>
      <CustomerProvider customer={customer}>
      {/* Reads useSearchParams, so it needs its own Suspense boundary —
          without one it opts the whole layout out of static rendering. */}
      <Suspense fallback={null}>
        <RouteTransitionOverlay />
      </Suspense>
      <AnalyticsIdentify customerId={customer?.id} />
      <LaunchBanner />
      <AnnouncementBar text={homepageSettings?.announcement_text} />
      <Nav />
      {customer && cart && (
        <CartMismatchBanner customer={customer} cart={cart} />
      )}

      {cart && (
        <FreeShippingPriceNudge
          variant="popup"
          cart={cart}
          shippingOptions={shippingOptions}
        />
      )}
      {props.children}
      <Footer />
      {/* Order matters: the chat listens for the popup's "done" signal, so it
          must mount first. One card per visit, rotated in the browser; the
          sign-up card is for guests only. */}
      <Chatbot />
      <WelcomePopup cards={buildWelcomeCards(homepageSettings, !customer)} />
      </CustomerProvider>
    </CartProvider>
  )
}
