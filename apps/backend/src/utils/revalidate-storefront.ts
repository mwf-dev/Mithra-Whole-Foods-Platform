/**
 * Asks the Next.js storefront to drop its cached pages so admin changes
 * (products, categories, homepage settings) appear immediately.
 * Requires STOREFRONT_URL + REVALIDATE_SECRET; failures are logged and
 * swallowed — a slow cache must never fail the admin operation.
 */
export const revalidateStorefront = async (
  path: string = "/",
  type: "layout" | "page" = "layout"
): Promise<void> => post({ path, type })

/**
 * Purges the storefront's cached catalog data by tag.
 *
 * Prefer this over the path-based call for anything catalog-shaped. The
 * storefront caches each `/store/*` read as its own Data Cache entry keyed by
 * URL, so the product listing and a product detail page are separate entries;
 * revalidating the "/" layout does not reliably reach the one behind a dynamic
 * `/[countryCode]/(main)/products/[handle]` route. Tags purge every entry that
 * carries them, whichever URL produced it.
 */
export const revalidateStorefrontTags = async (
  tags: string[]
): Promise<void> => {
  if (!tags.length) {
    return
  }
  return post({ tags })
}

const post = async (body: Record<string, unknown>): Promise<void> => {
  const storefrontUrl = process.env.STOREFRONT_URL
  const secret = process.env.REVALIDATE_SECRET

  if (!storefrontUrl || !secret) {
    console.warn(
      "[revalidate] STOREFRONT_URL / REVALIDATE_SECRET not set — skipping storefront cache revalidation"
    )
    return
  }

  try {
    const res = await fetch(`${storefrontUrl.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      console.warn(`[revalidate] storefront revalidation failed: ${res.status}`)
    }
  } catch (e) {
    console.warn("[revalidate] storefront revalidation request failed", e)
  }
}
