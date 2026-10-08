import { Metadata } from "next"
import { BUSINESS } from "@lib/business"
import { LegalPage } from "@modules/legal/legal-page"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: `Terms of Service | ${BUSINESS.name}`,
  description: "Terms for using the Mithra Whole Foods website and placing orders.",
}

export default function Page() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        By using this website or placing an order you agree to these terms. The store is operated
        by {BUSINESS.legalName} (&quot;we&quot;).
      </p>
      <h2>Orders and pricing</h2>
      <p>
        Prices are in US dollars. An order is accepted when we confirm it by email. We may cancel
        or limit an order, for example for a pricing error, stock shortage or suspected fraud, and
        will refund anything you have paid for a cancelled order.
      </p>
      <h2>Payment</h2>
      <p>
        Payment is taken by card through our payment processor or, where offered, as cash on
        delivery. You confirm you are authorised to use the payment method you choose.
      </p>
      <h2>Shipping and returns</h2>
      <p>
        See our <LocalizedClientLink className="underline" href="/shipping-policy">Shipping Policy</LocalizedClientLink> and{" "}
        <LocalizedClientLink className="underline" href="/refund-policy">Refund Policy</LocalizedClientLink>.
      </p>
      <h2>Products and food information</h2>
      <p>
        We take care that descriptions and images are accurate, but packaging may vary. Check the
        label for ingredients and allergens before consuming. If you have an allergy, contact us
        before ordering.
      </p>
      <h2>Accounts</h2>
      <p>
        You are responsible for keeping your login details secure and for activity under your
        account. You may also order as a guest.
      </p>
      <h2>Use of the site</h2>
      <p>
        Do not misuse the site, attempt to disrupt it, or access areas you are not authorised to
        use. Site content, images and branding belong to us and may not be copied without
        permission.
      </p>
      <h2>Liability</h2>
      <p>
        To the extent permitted by law, our liability for any claim relating to an order is limited
        to the amount you paid for that order. Nothing in these terms limits rights you have under
        applicable consumer law.
      </p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the Commonwealth of Pennsylvania, USA.</p>
    </LegalPage>
  )
}
