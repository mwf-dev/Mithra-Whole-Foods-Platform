import { Metadata } from "next"

import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { hasDismissedWelcomePrompt } from "@lib/data/cookies"
import { retrieveCustomer } from "@lib/data/customer"
import { getHomepageSettings } from "@lib/data/homepage"
import { getBaseURL } from "@lib/util/env"
import { CartProvider } from "@lib/context/cart-context"
import { AnalyticsIdentify } from "@lib/analytics/provider"
import { StoreCartShippingOption } from "@medusajs/types"
import { AnnouncementBar } from "@modules/home/components/announcement-bar"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import Chatbot from "@modules/layout/components/chatbot"
import WelcomeSignInPrompt from "@modules/layout/components/welcome-sign-in-prompt"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import FreeShippingPriceNudge from "@modules/shipping/components/free-shipping-price-nudge"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode }) {
  const [customer, cart, homepageSettings, welcomeDismissed] =
    await Promise.all([
      retrieveCustomer(),
      retrieveCart(),
      getHomepageSettings(),
      hasDismissedWelcomePrompt(),
    ])
  let shippingOptions: StoreCartShippingOption[] = []

  if (cart) {
    const { shipping_options } = await listCartOptions()

    shippingOptions = shipping_options
  }

  return (
    <CartProvider initialCart={cart}>
      <AnalyticsIdentify customerId={customer?.id} />
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
      <Chatbot />

      {/* Guests only, and only until they wave it away. */}
      {!customer && !welcomeDismissed && <WelcomeSignInPrompt />}
    </CartProvider>
  )
}
