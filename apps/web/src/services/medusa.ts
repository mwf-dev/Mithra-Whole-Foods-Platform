import Medusa from "@medusajs/js-sdk"

export type HomepageSettings = {
  id: string
  hero_title: string | null
  hero_subtitle: string | null
  hero_image_url: string | null
  promo_card_1_title: string | null
  promo_card_1_url: string | null
  promo_card_2_title: string | null
  promo_card_2_url: string | null
  created_at: string
  updated_at: string
}

export const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})


export async function getHomepageSettings(): Promise<HomepageSettings | null> {
  try {
    // We moved the backend route to /homepage (from /store/homepage) to bypass 
    // the Medusa Publishable API Key requirement for now.
    const res = await fetch(`${BACKEND_URL}/homepage`, {
      next: { revalidate: 0 }, // For development, no cache. Use a sensible revalidate time in production.
    })
    
    if (!res.ok) {
      console.error("Failed to fetch homepage settings:", await res.text())
      return null
    }

    const data = await res.json()
    return data.homepage_settings || null
  } catch (error) {
    console.error("Error fetching homepage settings:", error)
    return null
  }
}

export async function getBestSellers() {
  try {
    const { collections } = await sdk.store.collection.list({
      handle: "homepage-best-sellers",
    }, { next: { revalidate: 0 } }); // for dev

    if (!collections || collections.length === 0) {
      return [];
    }

    const { products } = await sdk.store.product.list({
      collection_id: collections[0].id,
      fields: "*variants,*variants.prices",
    }, { next: { revalidate: 0 } });

    return products;
  } catch (error) {
    console.error("Error fetching best sellers:", error);
    return [];
  }
}

export async function getCategories() {
  try {
    const { product_categories } = await sdk.store.category.list({
      fields: "*products",
    }, { next: { revalidate: 0 } });
    
    return product_categories || [];
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}
