import { Metadata } from "next"
import { BUSINESS } from "@lib/business"
import { LegalPage } from "@modules/legal/legal-page"

export const metadata: Metadata = {
  title: `Privacy Policy | ${BUSINESS.name}`,
  description: "How Mithra Whole Foods collects, uses and protects your information.",
}

export default function Page() {
  return (
    <LegalPage title="Privacy Policy">
      <p>
        {BUSINESS.legalName} (&quot;we&quot;) operates {BUSINESS.name}. This policy explains what
        we collect when you use our website and place an order, and what we do with it.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>Details you give us: name, email, phone number, shipping and billing address, and your order contents.</li>
        <li>Account details if you create an account: email and a password (stored hashed; we cannot read it).</li>
        <li>Reviews or messages you choose to send us.</li>
        <li>Technical and usage data such as pages viewed and device/browser type, collected with analytics and error-monitoring tools to keep the site fast and working.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To process and deliver your order and send order, shipping and delivery updates.</li>
        <li>To respond to your questions and provide customer support.</li>
        <li>To prevent fraud and keep the site secure.</li>
        <li>To understand how the site is used and improve it.</li>
      </ul>
      <h2>Who we share it with</h2>
      <p>
        We share only what is needed with service providers that help us run the store: payment
        processing (Stripe), shipping and carriers (Easyship and the carriers they use), email
        delivery, hosting, and analytics. We do not sell your personal information.
      </p>
      <h2>Payments</h2>
      <p>
        Card details are entered with our payment processor and are never stored on our servers.
      </p>
      <h2>Your choices</h2>
      <p>
        You can ask us to access, correct or delete your personal information, or opt out of
        marketing messages, by contacting us below. Order records may be kept as required for
        tax and accounting purposes.
      </p>
      <h2>Children</h2>
      <p>Our website is not directed to children under 13.</p>
      <h2>Changes</h2>
      <p>We may update this policy; the date above shows the latest version.</p>
    </LegalPage>
  )
}
