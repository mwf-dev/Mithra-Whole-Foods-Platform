import { Metadata } from "next"

import { Hero } from "@modules/home/components/hero"
import { BestSellers } from "@modules/home/components/best-sellers"
import { CategoryTiles } from "@modules/home/components/category-tiles"
import { OfferCards } from "@modules/home/components/offer-cards"
import { PromoCards } from "@modules/home/components/promo-cards"
import { getHomepageSettings } from "@lib/data/homepage"
import { getRegion } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"
import { swallow } from "@lib/observability/report"

export const metadata: Metadata = {
  title: "Mithra Whole Foods",
  description:
    "Premium quality traditional food sourced directly from nature.",
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params
  const { listCategories } = await import("@lib/data/categories")

  const [region, settings, productsResult, categories] = await Promise.all([
    getRegion(countryCode),
    getHomepageSettings(),
    listProducts({
      pageParam: 1,
      queryParams: { limit: 12 },
      countryCode,
    }).catch(
      swallow(
        { response: { products: [], count: 0 }, nextPage: null },
        "home.listProducts"
      )
    ),
    listCategories().catch(swallow([], "home.listCategories")),
  ])

  const { response: { products } } = productsResult

  if (!region) {
    return null
  }

  return (
    <>
      <Hero settings={settings} />
      <CategoryTiles tiles={settings?.category_tiles} categories={categories} />
      <OfferCards cards={settings?.offer_cards} />
      <BestSellers products={products} region={region} />
      <PromoCards settings={settings} />
    </>
  )
}
