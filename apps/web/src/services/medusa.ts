import Medusa from "@medusajs/js-sdk"

export type HomepageSettings = {
  id: string
  hero_title: string
  hero_subtitle: string
  hero_image_url: string | null
  promo_card_1_title: string | null
  promo_card_1_url: string | null
  promo_card_2_title: string | null
  promo_card_2_url: string | null
  created_at: string
  updated_at: string
}

if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL) {
  throw new Error("NEXT_PUBLIC_MEDUSA_BACKEND_URL is not set");
}

export const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

export const sdk = new Medusa({
  baseUrl: BACKEND_URL,
  debug: process.env.NODE_ENV === "development",
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
})

// Optional region ID for pricing (fallback to a specific env var or default if needed)
const REGION_ID = process.env.NEXT_PUBLIC_MEDUSA_REGION_ID;

export async function getHomepageSettings(): Promise<HomepageSettings | null> {
  // We moved the backend route to /homepage (from /store/homepage) to bypass 
  // the Medusa Publishable API Key requirement for now.
  const res = await fetch(`${BACKEND_URL}/homepage`, {
    next: { revalidate: 60 },
  })
  
  if (!res.ok) {
    throw new Error(`Failed to fetch homepage settings: ${await res.text()}`)
  }

  const data = await res.json()
  return data.homepage_settings || null
}

export async function getBestSellers() {
  const { collections } = await sdk.store.collection.list({
    handle: "homepage-best-sellers",
  });

  if (!collections || collections.length === 0) {
    return [];
  }

  const query: any = {
    collection_id: collections[0].id,
    fields: "*variants,*variants.calculated_price",
  };
  
  if (REGION_ID) {
    query.region_id = REGION_ID;
  }

  const { products } = await sdk.store.product.list(query);
  return products;
}

export async function getCategories() {
  // Removed the expensive *products field; if counts are needed, 
  // they should be fetched via metadata or specific endpoints.
  const { product_categories } = await sdk.store.category.list({
    fields: "id,name,handle",
  });
  
  return product_categories || [];
}

export async function getProducts(categoryId?: string) {
  const query: any = {
    fields: "*variants,*variants.calculated_price,*categories",
  };
  
  if (categoryId) {
    query.category_id = [categoryId];
  }
  
  if (REGION_ID) {
    query.region_id = REGION_ID;
  }
  
  const { products } = await sdk.store.product.list(query);
  return products || [];
}

export async function getProductByHandle(handle: string) {
  const query: any = {
    handle,
    fields: "*variants,*variants.calculated_price,*categories,*options",
  };
  
  if (REGION_ID) {
    query.region_id = REGION_ID;
  }

  const { products } = await sdk.store.product.list(query);
  return products?.[0] || null;
}
