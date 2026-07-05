import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ProductCard } from './ProductCard';

export function MostLovedProducts() {
  const dummyProducts = [
    {
      title: 'Premium Cold Pressed Groundnut Oil',
      weight: '1 Litre',
      price: 350,
      originalPrice: 400,
      rating: 4.8,
      reviews: 124,
      isNew: false,
    },
    {
      title: 'Organic Foxtail Millet (Thinai)',
      weight: '500g',
      price: 85,
      rating: 4.9,
      reviews: 89,
      isNew: true,
    },
    {
      title: 'A2 Desi Cow Ghee (Bilona Method)',
      weight: '500ml',
      price: 899,
      originalPrice: 950,
      rating: 5.0,
      reviews: 245,
      isNew: false,
    },
    {
      title: 'Sprouted Multi-Grain Health Mix',
      weight: '250g',
      price: 150,
      rating: 4.7,
      reviews: 56,
      isNew: false,
    },
    {
      title: 'Pure Palm Jaggery (Karupatti)',
      weight: '1kg',
      price: 280,
      originalPrice: 320,
      rating: 4.8,
      reviews: 112,
      isNew: false,
    }
  ];

  return (
    <section className="py-16 bg-[#F8FAF9]">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 font-playfair mb-2">Most Loved Products</h2>
            <p className="text-gray-600">Our highest rated traditional staples, loved by families across India.</p>
          </div>
          <Link href="/shop" className="text-[#2E5C31] font-bold text-sm flex items-center gap-1 hover:gap-2 transition-all shrink-0">
            View All Products <ArrowRight size={16} />
          </Link>
        </div>

        {/* Horizontal Scroll / Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
          {dummyProducts.map((product, i) => (
            <ProductCard key={i} {...product} />
          ))}
        </div>
      </div>
    </section>
  );
}
