/**
 * Asks the Next.js storefront to drop its cached pages so admin changes
 * (products, categories, homepage settings) appear immediately.
 * Requires STOREFRONT_URL + REVALIDATE_SECRET; failures are logged and
 * swallowed — a slow cache must never fail the admin operation.
 */
export const revalidateStorefront = async (
  path: string = "/",
  type: "layout" | "page" = "layout"
): Promise<void> => {
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
      body: JSON.stringify({ path, type }),
    })
    if (!res.ok) {
      console.warn(`[revalidate] storefront revalidation failed: ${res.status}`)
    }
  } catch (e) {
    console.warn("[revalidate] storefront revalidation request failed", e)
  }
}
