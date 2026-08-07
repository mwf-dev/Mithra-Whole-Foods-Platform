import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { DM_Serif_Display, Inter } from "next/font/google"
import "styles/globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

import { Analytics } from "@vercel/analytics/react"
import AnalyticsProvider from "@lib/analytics/provider"

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" className={`${inter.variable} ${dmSerif.variable}`} suppressHydrationWarning>
      <body>
        <main className="relative">{props.children}</main>
        {/* Vercel Analytics stays for Web Vitals; the commerce funnel lives in
            AnalyticsProvider (PostHog). Both no-op without their keys. */}
        <Analytics />
        <AnalyticsProvider />
      </body>
    </html>
  )
}

