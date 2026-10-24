import type { MetadataRoute } from "next"

// Production keeps the crawl-everything default; staging (NEXT_PUBLIC_NOINDEX=true)
// asks every crawler to stay out.
export default function robots(): MetadataRoute.Robots {
  const closed = process.env.NEXT_PUBLIC_NOINDEX === "true"
  return { rules: { userAgent: "*", ...(closed ? { disallow: "/" } : { allow: "/" }) } }
}
