export interface HomepageBanner {
  title?: string
  subtitle?: string
  image_url?: string
  link?: string
}

export interface HomepageCard {
  title?: string
  image_url?: string
  link?: string
}

export interface HomepageCategoryTile {
  name?: string
  image_url?: string
  link?: string
}

export interface HomepageSettings {
  hero_title?: string | null
  hero_subtitle?: string | null
  hero_image_url?: string | null
  promo_card_1_title?: string | null
  promo_card_1_url?: string | null
  promo_card_2_title?: string | null
  promo_card_2_url?: string | null
  announcement_text?: string | null
  footer_tagline?: string | null
  hero_banners?: HomepageBanner[] | null
  offer_cards?: HomepageCard[] | null
  category_tiles?: HomepageCategoryTile[] | null
}

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

/**
 * Admin-managed homepage content (hero, banners, offer cards, tiles,
 * announcement, footer tagline). Cached for 60s and also revalidated
 * on demand when the admin saves (via /api/revalidate). Multiple callers
 * per render are deduplicated by Next's fetch cache.
 */
export async function getHomepageSettings(): Promise<HomepageSettings | null> {
  try {
    const res = await fetch(`${BACKEND_URL}/homepage`, {
      next: { revalidate: 60 },
    })
    if (!res.ok) {
      return null
    }
    const data = await res.json()
    return data.homepage_settings ?? null
  } catch (e) {
    console.error("Failed to fetch homepage settings", e)
    return null
  }
}

/** Prefixes backend-relative upload paths (/static/...) with the backend URL. */
export function resolveBackendImage(url?: string | null): string {
  if (!url) {
    return ""
  }
  return url.startsWith("/") ? `${BACKEND_URL}${url}` : url
}
