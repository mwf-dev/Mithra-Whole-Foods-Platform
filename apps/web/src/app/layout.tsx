import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { DM_Serif_Display, Inter, Tangerine } from "next/font/google"
import "styles/globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
})

// The chancery-style hand on the client's sign and business card. Used for the
// wordmark and tagline only; one weight, so it is a single small file.
const brandScript = Tangerine({
  subsets: ["latin"],
  weight: "700",
  variable: "--font-brand",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  // Official Mithra mark (see modules/layout/components/logo).
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
}

import { Analytics } from "@vercel/analytics/react"
import AnalyticsProvider from "@lib/analytics/provider"
import BusinessStructuredData from "@modules/common/components/business-structured-data"

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" className={`${inter.variable} ${dmSerif.variable} ${brandScript.variable}`} suppressHydrationWarning>
      <body>
        <BusinessStructuredData />
        <main className="relative">{props.children}</main>
        {/* Vercel Analytics stays for Web Vitals; the commerce funnel lives in
            AnalyticsProvider (PostHog). Both no-op without their keys. */}
        <Analytics />
        <AnalyticsProvider />
      </body>
    </html>
  )
}

