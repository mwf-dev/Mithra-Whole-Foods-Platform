import { ShoppingBag } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const EmptyCartMessage = () => {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-24 px-4"
      data-testid="empty-cart-message"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#F3F7F4] text-[#2E5C31] mb-6">
        <ShoppingBag size={32} strokeWidth={1.6} />
      </div>
      <h1 className="font-display text-3xl md:text-4xl text-ui-fg-base">
        Your cart is empty
      </h1>
      <p className="text-ui-fg-subtle mt-3 max-w-md">
        Looks like you haven&apos;t added anything yet. Explore our premium
        traditional foods and fill it up.
      </p>
      <LocalizedClientLink
        href="/store"
        className="mt-8 inline-flex items-center justify-center rounded-full bg-[#2E5C31] px-7 py-3 text-sm font-semibold text-white hover:bg-[#264d29] transition-colors"
        data-testid="empty-cart-explore-link"
      >
        Explore products
      </LocalizedClientLink>
    </div>
  )
}

export default EmptyCartMessage
