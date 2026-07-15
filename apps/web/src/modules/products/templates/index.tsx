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

  return (
    <div className="bg-[#FAFAFA] min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center gap-2 text-sm text-gray-500">
          <LocalizedClientLink href="/" className="hover:text-primary">Home</LocalizedClientLink>
          <ChevronRight size={16} />
          <LocalizedClientLink href="/store" className="hover:text-primary">Shop</LocalizedClientLink>
          <ChevronRight size={16} />
          <span className="text-gray-900 font-medium">{product.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="bg-white rounded-2xl p-6 md:p-12 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-12">
          
          {/* Images */}
          <div className="w-full md:w-1/2">
            <ProductGallery images={images} title={product.title} />
          </div>

          {/* Details */}
          <div className="w-full md:w-1/2 flex flex-col">
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

            <p className="text-gray-600 leading-relaxed mb-8">
              {product.description || "Premium quality traditional food sourced directly from nature. Rich in nutrients and perfect for a healthy lifestyle."}
            </p>

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
