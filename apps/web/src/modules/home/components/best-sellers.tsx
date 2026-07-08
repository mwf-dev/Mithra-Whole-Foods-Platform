import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import ProductPreview from '@modules/products/components/product-preview';
import { HttpTypes } from '@medusajs/types';

export function BestSellers({ products = [], region }: { products?: HttpTypes.StoreProduct[], region?: HttpTypes.StoreRegion }) {
  if (!products || products.length === 0 || !region) {
    return (
      <section className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-playfair mb-4">Today's Best Sellers</h2>
          <p className="text-gray-500">Check back later for our best sellers!</p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-playfair">Today's Best Sellers</h2>
          <Link href="/store" className="text-gray-900 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all shrink-0">
            View All <ArrowRight size={16} />
          </Link>
        </div>

        <div className="relative">
          {/* Navigation Arrows */}
          <button className="absolute left-0 top-1/2 -translate-y-1/2 -ml-4 z-10 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-[#4A5D23] transition-colors hidden md:flex">
            <ChevronLeft size={20} />
          </button>
          
          <button className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 z-10 w-10 h-10 bg-white border border-gray-100 rounded-full shadow-md flex items-center justify-center text-gray-400 hover:text-[#4A5D23] transition-colors hidden md:flex">
            <ChevronRight size={20} />
          </button>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {products.map((product) => (
              <ProductPreview key={product.id} product={product} region={region} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
