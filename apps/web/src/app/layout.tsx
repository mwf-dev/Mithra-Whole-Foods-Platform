import { getBaseURL } from "@lib/util/env"
import { Metadata } from "next"
import { Inter, Playfair_Display } from "next/font/google"
import "styles/globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" })

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" data-mode="light" className={`${inter.variable} ${playfair.variable}`} suppressHydrationWarning>
      <body>
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
