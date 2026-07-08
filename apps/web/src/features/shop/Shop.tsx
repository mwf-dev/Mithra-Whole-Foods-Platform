"use client"
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Filter } from 'lucide-react';
import { ProductCard } from '@/features/home/components/ProductCard';

export function Shop({ products = [], categories = [], initialCategory = 'All' }: { products: any[], categories: any[], initialCategory?: string }) {
  const searchParams = useSearchParams();
  const activeCategory = searchParams?.get('category') || initialCategory;
  const [sortBy, setSortBy] = useState<string>('featured');

  const filteredProducts = useMemo(() => {
    let result = products;
    
    // Filter by category
    if (activeCategory !== 'All') {
      result = result.filter(p => p.categories?.some((c: any) => c.name === activeCategory));
    }
    
    // Sort
    if (sortBy === 'price-low') {
      result = [...result].sort((a, b) => (a.variants?.[0]?.calculated_price?.calculated_amount || 0) - (b.variants?.[0]?.calculated_price?.calculated_amount || 0));
    } else if (sortBy === 'price-high') {
      result = [...result].sort((a, b) => (b.variants?.[0]?.calculated_price?.calculated_amount || 0) - (a.variants?.[0]?.calculated_price?.calculated_amount || 0));
    } else if (sortBy === 'newest') {
      result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    
    return result;
  }, [products, activeCategory, sortBy]);

  return (
    <div className="bg-[#FAFAFA] min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-[#4A5D23]">Home</Link>
          <ChevronRight size={16} />
          <span className="text-gray-900 font-medium">Shop</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 flex flex-col md:flex-row gap-8">
        
        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white p-6 rounded-xl border border-gray-100 sticky top-24">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Filter size={18} /> Categories
            </h3>
            <ul className="space-y-3">
              <li>
                <Link 
                  href="/shop"
                  className={`block text-sm w-full text-left transition-colors ${activeCategory === 'All' ? 'text-[#4A5D23] font-bold' : 'text-gray-600 hover:text-[#4A5D23]'}`}
                >
                  All Products
                </Link>
              </li>
              {categories.map((cat, i) => (
                <li key={i}>
                  <Link 
                    href={`/shop?category=${encodeURIComponent(cat.name)}`}
                    className={`block text-sm w-full text-left transition-colors flex justify-between ${activeCategory === cat.name ? 'text-[#4A5D23] font-bold' : 'text-gray-600 hover:text-[#4A5D23]'}`}
                  >
                    <span>{cat.name}</span>
                    {/* ponytail: omitted count to save *products payload */}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            <h1 className="text-3xl font-bold text-gray-900 font-playfair">{activeCategory === 'All' ? 'All Products' : activeCategory}</h1>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Sort by:</label>
              <select 
                className="bg-white border border-gray-200 text-sm rounded-lg px-3 py-2 outline-none focus:border-[#4A5D23]"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="featured">Featured</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </div>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-500">Try selecting a different category.</p>
              <Link 
                href="/shop"
                className="inline-block mt-4 px-6 py-2 bg-[#4A5D23] text-white rounded font-bold text-sm hover:bg-[#3A4A1A] transition-colors"
              >
                Clear Filters
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredProducts.map((p, i) => (
                <div key={i}>
                  <ProductCard 
                    title={p.title}
                    weight={p.variants?.[0]?.title || '1kg'}
                    price={p.variants?.[0]?.calculated_price?.calculated_amount || 0}
                    rating={5.0}
                    reviews={10}
                    img={p.images?.[0]?.url}
                    href={`/products/${p.handle}`}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
