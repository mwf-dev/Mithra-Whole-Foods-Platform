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

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" className={`${inter.variable} ${dmSerif.variable}`} suppressHydrationWarning>
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
