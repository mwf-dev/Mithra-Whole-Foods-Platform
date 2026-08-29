import { Radio as RadioGroupOption } from "@headlessui/react"
import { Text, clx } from "@medusajs/ui"
import React, { useContext, useMemo, type JSX } from "react"

import Radio from "@modules/common/components/radio"

import { isManual, isStripeLike } from "@lib/constants"
import SkeletonCardDetails from "@modules/skeletons/components/skeleton-card-details"
import { CardElement } from "@stripe/react-stripe-js"
import { StripeCardElementOptions } from "@stripe/stripe-js"
import PaymentTest from "../payment-test"
import { StripeContext } from "../payment-wrapper/stripe-wrapper"

type PaymentContainerProps = {
  paymentProviderId: string
  selectedPaymentOptionId: string | null
  disabled?: boolean
  paymentInfoMap: Record<string, { title: string; icon: JSX.Element }>
  children?: React.ReactNode
}

const PaymentContainer: React.FC<PaymentContainerProps> = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  children,
}) => {
  const isDevelopment = process.env.NODE_ENV === "development"
  const isSelected = selectedPaymentOptionId === paymentProviderId

  return (
    <RadioGroupOption
      key={paymentProviderId}
      value={paymentProviderId}
      disabled={disabled}
      className={clx(
        "flex flex-col gap-y-3 cursor-pointer p-4 sm:p-5 border rounded-xl mb-3 transition-all duration-200 shadow-2xs",
        {
          "border-emerald-700 bg-emerald-50/20 ring-2 ring-emerald-600/20": isSelected,
          "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/50": !isSelected,
        }
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-3 sm:gap-x-4">
          <Radio checked={isSelected} />
          <div>
            <Text className="text-sm sm:text-base font-bold text-gray-900">
              {paymentInfoMap[paymentProviderId]?.title || paymentProviderId}
            </Text>
            {isStripeLike(paymentProviderId) && (
              <span className="text-[11px] text-gray-500 font-medium block sm:inline sm:ml-2">
                Credit / Debit Card, Apple Pay, Google Pay, PayPal
              </span>
            )}
          </div>
          {isManual(paymentProviderId) && isDevelopment && (
            <PaymentTest className="hidden small:block" />
          )}
        </div>
        <div className="flex items-center gap-1.5 justify-self-end text-gray-700">
          {paymentInfoMap[paymentProviderId]?.icon}
        </div>
      </div>
      {isManual(paymentProviderId) && isDevelopment && (
        <PaymentTest className="small:hidden text-[10px]" />
      )}
      {children}
    </RadioGroupOption>
  )
}

export default PaymentContainer

export const StripeCardContainer = ({
  paymentProviderId,
  selectedPaymentOptionId,
  paymentInfoMap,
  disabled = false,
  setCardBrand,
  setError,
  setCardComplete,
}: Omit<PaymentContainerProps, "children"> & {
  setCardBrand: (brand: string) => void
  setError: (error: string | null) => void
  setCardComplete: (complete: boolean) => void
}) => {
  const stripeReady = useContext(StripeContext)
  const isSelected = selectedPaymentOptionId === paymentProviderId

  const useOptions: StripeCardElementOptions = useMemo(() => {
    return {
      style: {
        base: {
          fontFamily: "Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          color: "#111827",
          fontSize: "15px",
          "::placeholder": {
            color: "#9ca3af",
          },
        },
        invalid: {
          color: "#ef4444",
        },
      },
      classes: {
        base: "py-3.5 px-4 block w-full bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-emerald-700 transition-all shadow-2xs",
      },
    }
  }, [])

  return (
    <PaymentContainer
      paymentProviderId={paymentProviderId}
      selectedPaymentOptionId={selectedPaymentOptionId}
      paymentInfoMap={paymentInfoMap}
      disabled={disabled}
    >
      {isSelected && (
        <div className="mt-3 pt-3 border-t border-gray-100 transition-all duration-200">
          {stripeReady ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Text className="text-xs font-bold text-gray-800">
                  Card Information
                </Text>
                <span className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1">
                  🔒 256-bit SSL Encrypted
                </span>
              </div>

              {/* Stripe PCI Element */}
              <div className="rounded-lg">
                <CardElement
                  options={useOptions}
                  onChange={(e) => {
                    setCardBrand(
                      e.brand ? e.brand.charAt(0).toUpperCase() + e.brand.slice(1) : ""
                    )
                    setError(e.error?.message || null)
                    setCardComplete(e.complete)
                  }}
                />
              </div>

              {/* Supported Payment Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-gray-500 font-medium">
                <span>Accepts Visa, Mastercard, Amex, Discover, Apple Pay</span>
                <span className="text-gray-400 font-semibold">Powered by Stripe</span>
              </div>
            </div>
          ) : (
            <SkeletonCardDetails />
          )}
        </div>
      )}
    </PaymentContainer>
  )
}
