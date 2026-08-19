import "server-only"
import { cookies as nextCookies } from "next/headers"

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    return {}
  }
}

/**
 * Tags whose payload is identical for every shopper — the catalog.
 *
 * These deliberately do NOT carry the `_medusa_cache_id` suffix. That id is a
 * random per-browser UUID (`src/middleware.ts`), but Next's Data Cache is keyed
 * by request URL, so one shared entry ends up tagged with whichever browser
 * happened to populate it. Nobody can then purge it: an admin edit invalidates
 * `products-<someone-else's-uuid>` and the live entry survives. Combined with
 * `cache: "force-cache"` that meant a product edit could never reach the
 * storefront. Same reasoning as `getCartCacheTag` below — tag the thing, not
 * the visitor.
 *
 * Tags only control invalidation, never cache keying, so sharing a tag across
 * visitors cannot leak one shopper's data to another. Anything genuinely
 * per-user (`customers`, `orders`) or per-cart (`fulfillment`,
 * `shippingOptions`) stays keyed by the browser id below.
 */
const GLOBAL_CACHE_TAGS = [
  "products",
  "categories",
  "collections",
  "regions",
  "variants",
  "locales",
  "payment_providers",
] as const

const isGlobalCacheTag = (tag: string): boolean =>
  GLOBAL_CACHE_TAGS.some((t) => tag === t || tag.startsWith(`${t}-`)) ||
  tag.startsWith("product-reviews-")

export const getCacheTag = async (tag: string): Promise<string> => {
  // Catalog data is the same for everyone, so it needs no browser id — and
  // notably still works when the cookie is missing, where the per-browser
  // branch below returns "" and leaves the fetch with no tag at all.
  if (isGlobalCacheTag(tag)) {
    return tag
  }

  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch (error) {
    return ""
  }
}

/**
 * Safety net for catalog reads: every one of them is `cache: "force-cache"`,
 * which without a TTL means an entry lives until something purges it by tag.
 * Tag purging is now reliable (see above), but it still depends on the backend
 * subscriber reaching this app — and if that request is ever dropped, five
 * minutes stale beats stale forever. Do not lower this: catalog reads land on
 * the shared `/store/*` rate-limit budget (CLAUDE.md, invariant 2).
 */
const CATALOG_REVALIDATE_SECONDS = 300

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[]; revalidate?: number } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  // Per-user and per-cart payloads keep their purge-only behaviour; they are
  // invalidated explicitly on every mutation that touches them.
  if (!isGlobalCacheTag(tag)) {
    return { tags: [cacheTag] }
  }

  return { tags: [cacheTag], revalidate: CATALOG_REVALIDATE_SECONDS }
}

/**
 * Cache tag for one specific cart.
 *
 * Deliberately keyed by cart id rather than by `_medusa_cache_id`. That id is a
 * random per-browser UUID (see `src/middleware.ts`), but Next's Data Cache is
 * keyed by request URL — so once two devices share a cart they share one cache
 * entry, tagged with whichever browser happened to populate it. A mutation on
 * one device then can't reliably purge it and the other device keeps serving a
 * stale cart. Tagging by cart id means every holder of that cart invalidates
 * the same entry.
 */
export const getCartCacheTag = async (cartId?: string): Promise<string> => {
  const id = cartId ?? (await getCartId())
  return id ? `cart-${id}` : ""
}

export const getCartCacheOptions = async (
  cartId?: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const tag = await getCartCacheTag(cartId)

  return tag ? { tags: [tag] } : {}
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  const cookies = await nextCookies()
  return cookies.get("_medusa_cart_id")?.value
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
}

const WELCOME_PROMPT_COOKIE = "_mithra_welcome_dismissed"

/**
 * Whether this visitor has already waved away the sign-in invite. Read on the
 * server so a dismissed prompt is never sent to the browser at all — rendering
 * it and hiding it client-side would flash it again on every page.
 */
export const hasDismissedWelcomePrompt = async (): Promise<boolean> => {
  try {
    const cookies = await nextCookies()
    return cookies.get(WELCOME_PROMPT_COOKIE)?.value === "1"
  } catch {
    return false
  }
}

export const setWelcomePromptDismissed = async () => {
  const cookies = await nextCookies()
  cookies.set(WELCOME_PROMPT_COOKIE, "1", {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    // `lax`, not `strict`: a shopper arriving from Google or an email link
    // would otherwise not send the cookie and would be greeted all over again.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}

const MERGE_NOTICE_COOKIE = "_medusa_cart_merge_notice"

export type MergedInItem = {
  title: string
  quantity: number
  thumbnail: string | null
}

/**
 * Records items that appeared in the shopper's cart because signing in
 * reunited them with a cart from another device. Signing in must never
 * silently change what someone is about to pay for, so the cart page reads
 * this and tells them what showed up before they check out again.
 *
 * Short-lived: it describes one sign-in, not a durable preference.
 */
export const setCartMergeNotice = async (items: MergedInItem[]) => {
  if (!items.length) {
    return
  }

  const cookies = await nextCookies()
  cookies.set(MERGE_NOTICE_COOKIE, JSON.stringify(items.slice(0, 20)), {
    maxAge: 60 * 5,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

/** Reads the sign-in merge notice and clears it, so it only shows once. */
export const readCartMergeNotice = async (): Promise<MergedInItem[]> => {
  const cookies = await nextCookies()
  const raw = cookies.get(MERGE_NOTICE_COOKIE)?.value

  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as MergedInItem[]) : []
  } catch {
    return []
  }
}

export const clearCartMergeNotice = async () => {
  const cookies = await nextCookies()
  cookies.set(MERGE_NOTICE_COOKIE, "", { maxAge: -1 })
}
