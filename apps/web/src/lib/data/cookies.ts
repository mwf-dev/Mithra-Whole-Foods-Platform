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

export const getCacheTag = async (tag: string): Promise<string> => {
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

export const getCacheOptions = async (
  tag: string
): Promise<{ tags: string[] } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const cacheTag = await getCacheTag(tag)

  if (!cacheTag) {
    return {}
  }

  return { tags: [`${cacheTag}`] }
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
