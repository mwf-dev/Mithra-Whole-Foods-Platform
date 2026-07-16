import { Metadata } from "next"

import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getHomepageSettings } from "@lib/data/homepage"
import { getBaseURL } from "@lib/util/env"
import { CartProvider } from "@lib/context/cart-context"
import { StoreCartShippingOption } from "@medusajs/types"
import { AnnouncementBar } from "@modules/home/components/announcement-bar"
import CartMismatchBanner from "@modules/layout/components/cart-mismatch-banner"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
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
    </CartProvider>
  )
}
