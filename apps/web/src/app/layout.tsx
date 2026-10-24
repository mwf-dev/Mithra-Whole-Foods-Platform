import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { DM_Serif_Display, Inter, Noto_Sans_Tamil } from "next/font/google"
import "styles/globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["500", "600"],
  variable: "--font-tamil",
  display: "swap",
})
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  // Official Mithra mark (see modules/layout/components/logo).
  // Staging must never be indexed (set NEXT_PUBLIC_NOINDEX=true there).
  ...(process.env.NEXT_PUBLIC_NOINDEX === "true" ? { robots: { index: false, follow: false } } : {}),
  icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
}

import { Analytics } from "@vercel/analytics/react"
import AnalyticsProvider from "@lib/analytics/provider"
import BusinessStructuredData from "@modules/common/components/business-structured-data"

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" className={`${inter.variable} ${dmSerif.variable} ${notoTamil.variable}`} suppressHydrationWarning>
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

