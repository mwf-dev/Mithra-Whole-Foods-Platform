import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import Divider from "@modules/common/components/divider"
import { HttpTypes } from "@medusajs/types"

const CartTemplate = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const hasItems = !!cart?.items?.length

  return (
    <div className="py-10 min-h-[60vh]">
      <div className="content-container" data-testid="cart-container">
        {hasItems ? (
          <>
            <h1 className="font-display text-3xl md:text-4xl text-ui-fg-base mb-8">
              Your cart
            </h1>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 lg:gap-8 items-start">
              <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 md:p-8">
                {!customer && (
                  <>
                    <SignInPrompt />
                    <Divider />
                  </>
                )}
                <ItemsTemplate cart={cart} />
              </div>
              <div className="lg:sticky lg:top-24">
                {cart && cart.region && (
                  <div className="rounded-2xl border border-gray-100 bg-white shadow-sm p-6 md:p-8">
                    <Summary cart={cart as any} />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <EmptyCartMessage />
        )}
      </div>
    </div>
  )
}

export default CartTemplate
