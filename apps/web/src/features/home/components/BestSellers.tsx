import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { ProductCard } from './ProductCard';

export function BestSellers() {
  const dummyProducts = [
    {
      title: 'Organic Little Millet',
      weight: '500g',
      price: 5.99,
      originalPrice: null,
      rating: 4.8,
      reviews: 124,
      isNew: false,
      img: 'https://placehold.co/200x250/ffffff/d4d4d4?text=Product+1'
    },
    {
      title: 'Barnyard Millet',
      weight: '500g',
      price: 4.99,
      rating: 4.9,
      reviews: 89,
      isNew: false,
      img: 'https://placehold.co/200x250/ffffff/d4d4d4?text=Product+2'
    },
    {
      title: 'Cold Pressed Groundnut Oil',
      weight: '1L',
      price: 9.99,
      originalPrice: 12.99,
      rating: 5.0,
      reviews: 245,
      isNew: false,
      img: 'https://placehold.co/200x250/ffffff/d4d4d4?text=Product+3'
    },
    {
      title: 'A2 Cow Ghee',
      weight: '500ml',
      price: 14.99,
      rating: 4.7,
      reviews: 56,
      isNew: false,
      img: 'https://placehold.co/200x250/ffffff/d4d4d4?text=Product+4'
    },
    {
      title: 'Multi Millet Health Mix',
      weight: '500g',
      price: 6.99,
      originalPrice: null,
      rating: 4.8,
      reviews: 112,
      isNew: false,
      img: 'https://placehold.co/200x250/ffffff/d4d4d4?text=Product+5'
    }
  ];

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 font-playfair">Today's Best Sellers</h2>
          <Link href="/shop" className="text-gray-900 font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all shrink-0">
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
            {dummyProducts.map((product, i) => (
              <ProductCard key={i} {...product} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
