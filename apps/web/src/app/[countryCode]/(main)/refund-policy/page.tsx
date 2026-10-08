import { Metadata } from "next"
import { BUSINESS } from "@lib/business"
import { LegalPage } from "@modules/legal/legal-page"

export const metadata: Metadata = {
  title: `Refund and Return Policy | ${BUSINESS.name}`,
  description: "Returns, refunds and what to do if there is a problem with your order.",
}

export default function Page() {
  return (
    <LegalPage title="Refund and Return Policy">
      <p>
        We want you to be happy with your order. Because these are food products, our policy is
        built around problems with the order rather than change of mind.
      </p>
      <h2>Damaged, incorrect or defective items</h2>
      <p>
        If an item arrives damaged, spoiled or is not what you ordered, contact us within 7 days
        of delivery with your order number and a photo. We will send a replacement or refund the
        item, including shipping where the error was ours. You do not need to return the product.
      </p>
      <h2>Change of mind</h2>
      <p>
        Opened or consumed food cannot be returned. For unopened, sealed items, contact us within
        7 days of delivery and we will consider a refund; return shipping is the customer&apos;s
        responsibility.
      </p>
      <h2>Cancelling an order</h2>
      <p>
        Contact us as soon as possible. If the order has not shipped we will cancel it and refund
        you in full.
      </p>
      <h2>How refunds are issued</h2>
      <p>
        Refunds go back to your original payment method and usually appear within 5–10 business
        days, depending on your bank. For cash-on-delivery orders we will arrange payment by an
        agreed method.
      </p>
    </LegalPage>
  )
}
