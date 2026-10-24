"use client"

import { setAddresses } from "@lib/data/cart"
import compareAddresses from "@lib/util/compare-addresses"
import { CheckCircleSolid } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import { Heading, Text, useToggleState } from "@medusajs/ui"
import Divider from "@modules/common/components/divider"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useActionState, useState } from "react"
import BillingAddress from "../billing_address"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"
import { SubmitButton } from "../submit-button"

const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "address"

  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  )

  const handleEdit = () => {
    router.push(pathname + "?step=address")
  }

  const [message, formAction] = useActionState(setAddresses, null)
  const [guestChosen, setGuestChosen] = useState(false)

  // Shoppers who are not signed in pick guest or account before any form.
  // A cart that already has an address means they chose earlier.
  const needsChoice =
    !customer && !guestChosen && !cart?.shipping_address?.address_1
  const backTo = encodeURIComponent(pathname + "?step=address")

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className="flex flex-row text-3xl-regular gap-x-2 items-baseline"
        >
          Shipping Address
          {!isOpen && <CheckCircleSolid />}
        </Heading>
        {!isOpen && cart?.shipping_address && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-address-button"
            >
              Edit
            </button>
          </Text>
        )}
      </div>
      {isOpen && needsChoice ? (
        <div className="grid gap-4 small:grid-cols-2" data-testid="checkout-choice">
          <div className="rounded-lg border border-ui-border-base p-5 flex flex-col gap-3">
            <h3 className="txt-medium-plus">Continue as guest</h3>
            <p className="text-small-regular text-ui-fg-subtle">
              Just your name, address, phone and email. No password needed.
            </p>
            <button
              type="button"
              onClick={() => setGuestChosen(true)}
              className="mt-auto h-11 rounded-md bg-[#2E5C31] px-4 text-white"
              data-testid="continue-as-guest"
            >
              Continue as guest
            </button>
          </div>
          <div className="rounded-lg border border-ui-border-base p-5 flex flex-col gap-3">
            <h3 className="txt-medium-plus">Mithra Whole Foods account</h3>
            <p className="text-small-regular text-ui-fg-subtle">
              Save your address, track orders and reorder in a click.
            </p>
            <div className="mt-auto flex gap-2">
              <LocalizedClientLink
                href={`/account?redirect=${backTo}`}
                className="flex h-11 flex-1 items-center justify-center rounded-md border border-[#2E5C31] text-[#2E5C31]"
                data-testid="choice-sign-in"
              >
                Sign in
              </LocalizedClientLink>
              <LocalizedClientLink
                href={`/account?view=register&redirect=${backTo}`}
                className="flex h-11 flex-1 items-center justify-center rounded-md border border-[#2E5C31] text-[#2E5C31]"
                data-testid="choice-sign-up"
              >
                Create account
              </LocalizedClientLink>
            </div>
          </div>
        </div>
      ) : isOpen ? (
        <form action={formAction}>
          {!customer && (
            <p
              className="mb-6 rounded-lg bg-[#F3F7F4] px-4 py-3 text-small-regular"
              data-testid="guest-checkout-note"
            >
              You&apos;re checking out as a guest.{" "}
              <LocalizedClientLink
                href={`/account?redirect=${backTo}`}
                className="underline"
              >
                Sign in instead
              </LocalizedClientLink>
            </p>
          )}
          <div className="pb-8">
            <ShippingAddress
              customer={customer}
              checked={sameAsBilling}
              onChange={toggleSameAsBilling}
              cart={cart}
            />

            {!sameAsBilling && (
              <div>
                <Heading
                  level="h2"
                  className="text-3xl-regular gap-x-4 pb-6 pt-8"
                >
                  Billing address
                </Heading>

                <BillingAddress cart={cart} />
              </div>
            )}
            <SubmitButton className="mt-6" data-testid="submit-address-button">
              Continue to delivery
            </SubmitButton>
            <ErrorMessage error={message} data-testid="address-error-message" />
          </div>
        </form>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && cart.shipping_address ? (
              <div className="flex items-start gap-x-8">
                <div className="flex items-start gap-x-1 w-full">
                  <div
                    className="flex flex-col w-1/3"
                    data-testid="shipping-address-summary"
                  >
                    <Text className="txt-medium-plus text-ui-fg-base mb-1">
                      Shipping Address
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {cart.shipping_address.first_name}{" "}
                      {cart.shipping_address.last_name}
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {cart.shipping_address.address_1}{" "}
                      {cart.shipping_address.address_2}
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {cart.shipping_address.postal_code},{" "}
                      {cart.shipping_address.city}
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {cart.shipping_address.country_code?.toUpperCase()}
                    </Text>
                  </div>

                  <div
                    className="flex flex-col w-1/3 "
                    data-testid="shipping-contact-summary"
                  >
                    <Text className="txt-medium-plus text-ui-fg-base mb-1">
                      Contact
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {cart.shipping_address.phone}
                    </Text>
                    <Text className="txt-medium text-ui-fg-subtle">
                      {cart.email}
                    </Text>
                  </div>

                  <div
                    className="flex flex-col w-1/3"
                    data-testid="billing-address-summary"
                  >
                    <Text className="txt-medium-plus text-ui-fg-base mb-1">
                      Billing Address
                    </Text>

                    {sameAsBilling ? (
                      <Text className="txt-medium text-ui-fg-subtle">
                        Billing and delivery address are the same.
                      </Text>
                    ) : (
                      <>
                        <Text className="txt-medium text-ui-fg-subtle">
                          {cart.billing_address?.first_name}{" "}
                          {cart.billing_address?.last_name}
                        </Text>
                        <Text className="txt-medium text-ui-fg-subtle">
                          {cart.billing_address?.address_1}{" "}
                          {cart.billing_address?.address_2}
                        </Text>
                        <Text className="txt-medium text-ui-fg-subtle">
                          {cart.billing_address?.postal_code},{" "}
                          {cart.billing_address?.city}
                        </Text>
                        <Text className="txt-medium text-ui-fg-subtle">
                          {cart.billing_address?.country_code?.toUpperCase()}
                        </Text>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <Spinner />
              </div>
            )}
          </div>
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Addresses
