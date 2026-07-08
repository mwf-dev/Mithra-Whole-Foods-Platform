import { Metadata } from "next"

import { Hero } from "@modules/home/components/hero"
import { BestSellers } from "@modules/home/components/best-sellers"
import { CategoryNav } from "@modules/home/components/category-nav"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"

export const metadata: Metadata = {
  title: "Mithra Whole Foods",
  description:
    "Premium quality traditional food sourced directly from nature.",
}

const fetchHomepageSettings = async () => {
  try {
    const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";
    const res = await fetch(`${BACKEND_URL}/homepage`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.homepage_settings;
  } catch (e) {
    console.error("Failed to fetch homepage settings", e);
    return null;
  }
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params
  // ponytail: parallelized to shave ~300ms off TTFB
  const [region, settings, productsResult] = await Promise.all([
    getRegion(countryCode),
    fetchHomepageSettings(),
    listProducts({
      pageParam: 1,
      queryParams: { limit: 12 },
      countryCode,
    }).catch((e) => {
      console.error("LIST PRODUCTS ERROR:", e);
      return { response: { products: [] } };
    })
  ])

  const { response: { products } } = productsResult;

  if (!region) {
    return null
  }

  return (
    <>
      <CategoryNav />
      <Hero settings={settings} />
      <BestSellers products={products} region={region} />
    </>
  )
}
