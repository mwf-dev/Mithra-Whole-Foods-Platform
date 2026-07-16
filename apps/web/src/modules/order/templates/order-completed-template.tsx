import { Heading } from "@medusajs/ui"
import { cookies as nextCookies } from "next/headers"
import { CheckCircle } from "lucide-react"

import CartTotals from "@modules/common/components/cart-totals"
import Help from "@modules/order/components/help"
import Items from "@modules/order/components/items"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import OrderDetails from "@modules/order/components/order-details"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import { HttpTypes } from "@medusajs/types"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"

  return (
    <div className="py-12 min-h-[calc(100vh-64px)] bg-[#f9f8f6]">
      <div className="content-container flex flex-col justify-center items-center gap-y-10 max-w-4xl mx-auto px-4 w-full">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        
        <div
          className="flex flex-col gap-8 max-w-3xl w-full bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-gray-100"
          data-testid="order-complete-container"
        >
          <div className="flex flex-col items-center text-center mb-2">
            <div className="w-16 h-16 bg-[#F3F7F4] text-[#2E5C31] flex items-center justify-center rounded-full mb-6">
              <CheckCircle className="w-8 h-8" strokeWidth={2} />
            </div>
            <h1 className="text-3xl md:text-4xl font-playfair font-bold text-[#1f291e] mb-3">
              Thank you!
            </h1>
            <p className="text-lg text-gray-600">
              Your order was placed successfully.
            </p>
          </div>
          
          <div className="border-t border-gray-100 pt-8">
            <OrderDetails order={order} />
          </div>

          <div className="border-t border-gray-100 pt-8">
            <h2 className="text-2xl font-playfair font-semibold text-[#1f291e] mb-6">
              Order Summary
            </h2>
            <Items order={order} />
            <div className="mt-8">
               <CartTotals totals={order} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
            <ShippingDetails order={order} />
            <PaymentDetails order={order} />
          </div>

          <div className="border-t border-gray-100 pt-8">
            <Help />
          </div>
        </div>
      </div>
    </div>
  )
}
