import { BUSINESS } from "@lib/business"
import { getBaseURL } from "@lib/util/env"

/**
 * schema.org "Organization" data for search engines: who the business is and
 * how to reach it. Built from the same constants as the footer and contact
 * page, so Google sees exactly what a shopper sees.
 */
export default function BusinessStructuredData() {
  const base = getBaseURL()
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BUSINESS.name,
    legalName: BUSINESS.legalName,
    slogan: BUSINESS.tagline,
    url: base,
    logo: `${base}/brand/mithra-mark.png`,
    email: BUSINESS.email,
    telephone: BUSINESS.phoneTel,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.address.street,
      addressLocality: BUSINESS.address.city,
      addressRegion: BUSINESS.address.region,
      postalCode: BUSINESS.address.postalCode,
      addressCountry: BUSINESS.address.country,
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: BUSINESS.phoneTel,
      email: BUSINESS.email,
      areaServed: "US",
      availableLanguage: "English",
    },
  }

  return (
    <script
      type="application/ld+json"
      // `<` is escaped so no field can ever close the script tag early.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  )
}
