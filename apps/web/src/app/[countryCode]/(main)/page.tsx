import { Metadata } from "next"

import { Hero } from "@modules/home/components/hero"
import { AisleDiscs } from "@modules/home/components/aisle-discs"
import { TopPicks } from "@modules/home/components/top-picks"
import { StoryStrip } from "@modules/home/components/story-strip"
import { FestivalBanner } from "@modules/home/components/festival-banner"
import { SpotlightBand } from "@modules/home/components/spotlight-band"
import { WhyMithra } from "@modules/home/components/why-mithra"
import { FilmStory } from "@modules/home/components/film-story"
import { SESAME_FILM } from "@modules/home/films"
import { OfferCards } from "@modules/home/components/offer-cards"
import { ShopByMoment } from "@modules/home/components/shop-by-moment"
import { ReviewsStrip } from "@modules/home/components/reviews-strip"
import { AISLES, SPOTLIGHT_AISLES, aisleProductIds } from "@modules/home/aisles"
import { getHomepageSettings } from "@lib/data/homepage"
import { getRegion } from "@lib/data/regions"
import { listProducts } from "@lib/data/products"
import { listCategories } from "@lib/data/categories"
import { getFeaturedReviews } from "@lib/data/reviews"
import { swallow } from "@lib/observability/report"

export const metadata: Metadata = {
  title: "Mithra Whole Foods — Harvesting Goodness",
  description:
    "Traditional South Indian foods — ghee, cold-pressed oils, podis, millets and traditional rice — shipped from Exton, PA.",
}

// The whole catalog (~55 products) in one request. Every rail, band and count
// on this page is derived from it, so adding a section never adds a backend
// call. Latency is flat in `limit` (measured 12 → 100: 2.25s → 2.41s; the
// cost is the DB round trip, not the rows — docs/SPEED_BENCHMARK_2026-08-06).
const CATALOG_LIMIT = 100

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  const [region, settings, productsResult, categories, reviews] =
    await Promise.all([
      getRegion(countryCode),
      getHomepageSettings(),
      listProducts({
        pageParam: 1,
        queryParams: { limit: CATALOG_LIMIT },
        countryCode,
      }).catch(
        swallow(
          { response: { products: [], count: 0 }, nextPage: null },
          "home.listProducts"
        )
      ),
      listCategories().catch(swallow([], "home.listCategories")),
      getFeaturedReviews(),
    ])

  if (!region) {
    return null
  }

  const products = productsResult.response.products

  const spotlights = SPOTLIGHT_AISLES.map((id) => AISLES.find((a) => a.id === id)!)
    .filter((a) => a?.spotlight)
    .map((aisle) => {
      const ids = aisleProductIds(aisle, categories)
      return { aisle, products: products.filter((p) => ids.has(p.id)) }
    })

  const band = (i: number) =>
    spotlights[i] ? (
      <SpotlightBand
        aisle={spotlights[i].aisle}
        products={spotlights[i].products}
        region={region}
        flip={i % 2 === 1}
      />
    ) : null

  return (
    <>
      <Hero />
      <AisleDiscs categories={categories} />
      <TopPicks products={products} categories={categories} region={region} />
      <StoryStrip />
      <FestivalBanner />
      {band(0)}
      <WhyMithra />
      <FilmStory
        film={SESAME_FILM}
        eyebrow="From seed to bottle"
        headline="Pressed slowly in wood, bottled with nothing added"
        body="Mithra sesame oil is cold pressed in a traditional wooden chekku, then bottled unrefined, with no chemicals and no additives."
        cta={{ label: "Shop cold-pressed oils", href: "/categories/cold-pressed-oils" }}
      />
      {band(1)}
      <OfferCards cards={settings?.offer_cards} />
      <ShopByMoment />
      {band(2)}
      <ReviewsStrip reviews={reviews} />
    </>
  )
}
