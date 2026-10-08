import { Metadata } from "next"
import { BUSINESS } from "@lib/business"
import { LegalPage } from "@modules/legal/legal-page"

export const metadata: Metadata = {
  title: `Shipping Policy | ${BUSINESS.name}`,
  description: "Where Mithra Whole Foods ships, how long it takes and what it costs.",
}

export default function Page() {
  return (
    <LegalPage title="Shipping Policy">
      <h2>Where we ship from and to</h2>
      <p>
        Orders ship from Exton, Pennsylvania to addresses in the United States. Ordering from
        outside the US is not currently available.
      </p>
      <h2>Processing time</h2>
      <p>
        We pack orders within 1–2 business days of receiving them (business days exclude weekends
        and holidays). You will receive an email when your order ships, with tracking.
      </p>
      <h2>Delivery time and cost</h2>
      <p>
        Standard and Express options are shown at checkout with their price and estimated delivery
        time for your address. Shipping is calculated from your delivery address and the weight of
        your order. Any free-shipping offer is shown on the site and applied at checkout.
      </p>
      <h2>Tracking</h2>
      <p>
        Every shipment has a tracking number, sent by email and shown in your account.
        Delivery estimates are provided by the carrier and are not guaranteed.
      </p>
      <h2>Address accuracy</h2>
      <p>
        Please double-check your address. If a package is returned because of an incorrect or
        incomplete address, we will contact you to arrange re-shipment, and the extra shipping
        cost may be charged to you.
      </p>
      <h2>Lost or delayed packages</h2>
      <p>
        If your tracking has not updated for several days or your package has not arrived, contact
        us and we will work with the carrier to resolve it.
      </p>
    </LegalPage>
  )
}
