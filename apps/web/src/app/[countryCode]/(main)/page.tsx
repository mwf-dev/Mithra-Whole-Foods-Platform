import { Metadata } from "next"

import Hero from "@modules/home/components/hero"
import { BestSellers } from "@modules/home/components/best-sellers"
import { CategoryNav } from "@modules/home/components/category-nav"
import { listCollections } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { getProductsList } from "@lib/data/products"

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
  const region = await getRegion(countryCode)

  const { response: { products } } = await getProductsList({
    pageParam: 1,
    queryParams: {
      limit: 10,
    },
    countryCode,
  }).catch(() => ({ response: { products: [] } }));

  if (!region) {
    return null
  }

  return (
    <>
      <CategoryNav />
      <Hero />
      <BestSellers products={products} region={region} />
    </>
  )
}
