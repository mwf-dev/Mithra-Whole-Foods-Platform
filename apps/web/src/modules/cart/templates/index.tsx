"use client"

import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"
import { useCart } from "@lib/context/cart-context"
import { useCustomer } from "@lib/context/customer-context"
import { convertToLocale } from "@lib/util/money"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { Button } from "@medusajs/ui"
import DiscountCode from "@modules/checkout/components/discount-code"
import FreeShippingNudge from "@modules/cart/components/free-shipping-nudge"
import CartMergeNotice, {
  MergedInItem,
} from "@modules/cart/components/cart-merge-notice"

function getCheckoutStep(cart: HttpTypes.StoreCart) {
  if (!cart?.shipping_address?.address_1 || !cart.email) {
    return "address"
  } else if (cart?.shipping_methods?.length === 0) {
    return "delivery"
  } else {
    return "payment"
  }
}

/**
 * Renders the cart from client context rather than server props.
 *
 * `useCart()` is the authoritative client cart — it is seeded by the `(main)`
 * layout and updated in place by every mutation, so arriving on this page
 * requires no backend call at all. See `src/app/[countryCode]/(main)/cart/page.tsx`.
 */
const CartTemplate = ({ mergedIn = [] }: { mergedIn?: MergedInItem[] }) => {
  const { cart } = useCart()
  const customer = useCustomer()
  const hasItems = !!cart?.items?.length
  const step = cart ? getCheckoutStep(cart) : "address"
  const totalItems = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0

  return (
    <div className="py-10 min-h-[60vh] pb-32 lg:pb-10">
      <div className="content-container" data-testid="cart-container">
        {hasItems ? (
          <>
            <h1 className="font-display text-3xl md:text-4xl text-ui-fg-base mb-8">
              Your cart
            </h1>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
              <div className="flex flex-col gap-6">
                <CartMergeNotice items={mergedIn} />

                {!customer && (
                  <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 md:p-8">
                    <SignInPrompt />
                  </div>
                )}
                
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 md:p-8 flex flex-col gap-4 lg:hidden">
                  <FreeShippingNudge cart={cart} />
                  <DiscountCode cart={cart} />
                </div>
                
                <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 md:p-8">
                  <ItemsTemplate cart={cart} />
                </div>
              </div>
              <div className="lg:sticky lg:top-24 flex flex-col gap-6">
                {cart && cart.region && (
                  <>
                    <div className="hidden lg:flex rounded-2xl border border-gray-100 bg-white shadow-sm p-6 md:p-8 flex-col gap-4">
                      <FreeShippingNudge cart={cart} />
                      <DiscountCode cart={cart} />
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 md:p-8 mb-6 lg:mb-0">
                      <Summary cart={cart as any} />
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <EmptyCartMessage />
        )}
      </div>

      {/* Mobile Sticky Checkout Bar */}
      {cart && hasItems && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-[0_-8px_15px_-3px_rgba(0,0,0,0.1)] z-50 lg:hidden flex flex-col gap-3 rounded-t-3xl">
          <div className="flex justify-between items-center px-2">
            <span className="font-medium text-lg text-ui-fg-subtle">Total ({totalItems} items):</span>
            <span className="font-bold text-2xl text-ui-fg-base">
              {convertToLocale({
                amount: cart.total || 0,
                currency_code: cart.currency_code,
              })}
            </span>
          </div>
          <LocalizedClientLink href={"/checkout?step=" + step} data-testid="checkout-button-mobile">
            <Button className="w-full h-12 text-lg rounded-full font-semibold bg-black hover:bg-gray-800 text-white border-none" variant="primary">
              Click to go to checkout
            </Button>
          </LocalizedClientLink>
        </div>
      )}
    </div>
  )
}

export default CartTemplate
