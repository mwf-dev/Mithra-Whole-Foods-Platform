import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import LocalizedClientLink from '@modules/common/components/localized-client-link';
import ProductPreview from '@modules/products/components/product-preview';
import { HttpTypes } from '@medusajs/types';

export function BestSellers({ products = [], region }: { products?: HttpTypes.StoreProduct[], region?: HttpTypes.StoreRegion }) {
  if (!products || products.length === 0 || !region) {
    return (
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-playfair mb-4">Today&apos;s Best Sellers</h2>
          <p className="text-gray-500">Check back later for our best sellers!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-playfair">Today&apos;s Best Sellers</h2>
          <LocalizedClientLink href="/store" className="text-gray-900 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all shrink-0">
            View All <ArrowRight size={16} />
          </LocalizedClientLink>
        </div>
      </div>

      <div className="w-full">
        {/* Scrolling Row */}
        <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-6 scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] scroll-pl-4 md:scroll-pl-8 xl:scroll-pl-[calc(50vw-40rem+2rem)]">
          {products.map((product, index) => (
            <div 
              key={product.id} 
              className={`w-[280px] md:w-[320px] shrink-0 snap-start ${
                index === 0 ? "ml-4 md:ml-8 xl:ml-[calc(50vw-40rem+2rem)]" : ""
              } ${
                index === products.length - 1 ? "mr-4 md:mr-8 xl:mr-[calc(50vw-40rem+2rem)]" : ""
              }`}
            >
              <ProductPreview product={product} region={region} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
