import React, { Suspense } from "react"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { ChevronRight, Truck, ShieldCheck, Leaf } from 'lucide-react'
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductActions from "@modules/products/components/product-actions"
import RelatedProducts from "@modules/products/components/related-products"
import SkeletonRelatedProducts from "@modules/skeletons/templates/skeleton-related-products"
import ProductActionsWrapper from "./product-actions-wrapper"
import ProductGallery from "@modules/products/components/product-gallery"
import ProductReviews from "@modules/products/components/reviews"
import { FilmStory } from "@modules/home/components/film-story"
import { filmForProduct } from "@modules/home/films"
import ProductStorySection, { StoryHighlights } from "@modules/products/components/product-story"
import { storyForProduct } from "@modules/products/product-stories"
import { cleanDescription } from "@lib/util/clean-description"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

const ProductTemplate: React.FC<ProductTemplateProps> = ({
  product,
  region,
  countryCode,
  images,
}) => {
  if (!product || !product.id) {
    return notFound()
  }

  const film = filmForProduct(product.handle)
  const story = storyForProduct(product.handle)
  // Legacy descriptions carry HTML entities and a "Tags:" tail; when nothing
  // readable is left, the story's first paragraph stands in.
  const description =
    cleanDescription(product.description) ||
    story?.intro[0] ||
    "Premium quality traditional food sourced directly from nature. Rich in nutrients and perfect for a healthy lifestyle."

  return (
    <div className="bg-[#FAFAFA] min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 flex items-center gap-2 text-sm text-gray-500">
          <LocalizedClientLink href="/" className="hover:text-primary">Home</LocalizedClientLink>
          <ChevronRight size={16} />
          <LocalizedClientLink href="/store" className="hover:text-primary">Shop</LocalizedClientLink>
          <ChevronRight size={16} />
          <span className="text-gray-900 font-medium">{product.title}</span>
        </div>
      </div>

      <div className="max-w-[1536px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 py-8 md:py-10">
        <div className="bg-white rounded-2xl p-4 sm:p-6 lg:p-8 xl:p-10 border border-gray-100 shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14">
          
          {/* Images */}
          <div className="w-full lg:col-span-7 xl:col-span-7">
            <ProductGallery images={images} title={product.title} />
          </div>

          {/* Details */}
          <div className="w-full lg:col-span-5 xl:col-span-5 flex flex-col">
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 font-playfair mb-2">{product.title}</h1>
              {product.subtitle && (
                <p className="text-base text-gray-500">{product.subtitle}</p>
              )}
            </div>

            {/* Price, quantity stepper and add-to-cart */}
            <div className="mb-6">
              <Suspense
                fallback={
                  <ProductActions
                    disabled={true}
                    product={product}
                    region={region}
                  />
                }
              >
                <ProductActionsWrapper id={product.id} region={region} />
              </Suspense>
            </div>

            <div className="h-px bg-gray-100 w-full mb-6"></div>

            <p className="text-gray-600 leading-relaxed mb-5">{description}</p>

            {story?.facts && story.facts.length > 0 && (
              <ul
                aria-label="At a glance"
                data-testid="product-facts"
                className="mb-8 flex flex-wrap gap-2"
              >
                {story.facts.map((fact) => (
                  <li
                    key={fact}
                    className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary"
                  >
                    {fact}
                  </li>
                ))}
              </ul>
            )}

            {story && <StoryHighlights story={story} />}

            {/* Trust Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-auto">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Truck className="text-primary" size={24} />
                <div>
                  <div className="text-xs font-bold text-gray-900">Fast Delivery</div>
                  <div className="text-[10px] text-gray-500">2-3 Business Days</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Leaf className="text-primary" size={24} />
                <div>
                  <div className="text-xs font-bold text-gray-900">100% Natural</div>
                  <div className="text-[10px] text-gray-500">No Preservatives</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <ShieldCheck className="text-primary" size={24} />
                <div>
                  <div className="text-xs font-bold text-gray-900">Secure Payment</div>
                  <div className="text-[10px] text-gray-500">256-bit Encryption</div>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {story && <ProductStorySection story={story} />}

        {/* Reviews */}
        {film && (
          <FilmStory
            variant="card"
            film={film}
            eyebrow="How it's made"
            headline="From seed to bottle"
            body="Cold pressed in a traditional wooden chekku, filtered, and bottled unrefined, with no chemicals and no additives."
          />
        )}

        <Suspense fallback={null}>
          <ProductReviews
            productId={product.id}
            handle={product.handle ?? ""}
            countryCode={countryCode}
          />
        </Suspense>

        {/* Related Products */}
        <div className="mt-20">
          <Suspense fallback={<SkeletonRelatedProducts />}>
            <RelatedProducts product={product} countryCode={countryCode} />
          </Suspense>
        </div>

      </div>
    </div>
  )
}

export default ProductTemplate
