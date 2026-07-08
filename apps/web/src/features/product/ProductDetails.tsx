"use client"
import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Star, Minus, Plus, ShoppingCart, Truck, ShieldCheck, Leaf } from 'lucide-react';
import { ProductCard } from '@/features/home/components/ProductCard';

export function ProductDetails({ product, relatedProducts = [] }: { product: any, relatedProducts?: any[] }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState(product.variants?.[0] || null);
  
  if (!product) return <div>Product not found</div>;

  const currentPrice = selectedVariant?.prices?.[0]?.amount || 0;
  const currentImage = product.images?.[0]?.url || 'https://placehold.co/600x800/ffffff/d4d4d4?text=Product';

  return (
    <div className="bg-[#FAFAFA] min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-white border-b border-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/" className="hover:text-[#4A5D23]">Home</Link>
          <ChevronRight size={16} />
          <Link href="/shop" className="hover:text-[#4A5D23]">Shop</Link>
          <ChevronRight size={16} />
          <span className="text-gray-900 font-medium">{product.title}</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="bg-white rounded-2xl p-6 md:p-12 border border-gray-100 shadow-sm flex flex-col md:flex-row gap-12">
          
          {/* Images */}
          <div className="w-full md:w-1/2">
            <div className="aspect-[4/5] bg-gray-50 rounded-xl overflow-hidden flex items-center justify-center p-8">
              <div 
                className="w-full h-full bg-contain bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${currentImage})` }}
              ></div>
            </div>
          </div>

          {/* Details */}
          <div className="w-full md:w-1/2 flex flex-col">
            <div className="mb-6">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 font-playfair mb-3">{product.title}</h1>
              
              <div className="flex items-center gap-4 mb-4">
                <div className="flex text-[#D4AF37]">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-current" />
                  ))}
                </div>
                <span className="text-sm text-gray-500">124 Reviews</span>
                <span className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">In Stock</span>
              </div>

              <div className="text-3xl font-bold text-gray-900">₹{currentPrice.toFixed(2)}</div>
            </div>

            <p className="text-gray-600 leading-relaxed mb-8">
              {product.description || "Premium quality traditional food sourced directly from nature. Rich in nutrients and perfect for a healthy lifestyle."}
            </p>

            {/* Variants */}
            {product.options?.map((option: any) => (
              <div key={option.id} className="mb-6">
                <h4 className="font-bold text-gray-900 mb-3">{option.title}</h4>
                <div className="flex flex-wrap gap-3">
                  {product.variants?.map((v: any) => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVariant(v)}
                      className={`px-4 py-2 border rounded-md text-sm font-medium transition-colors ${
                        selectedVariant?.id === v.id 
                          ? 'border-[#4A5D23] bg-[#4A5D23] text-white' 
                          : 'border-gray-200 text-gray-700 hover:border-[#4A5D23]'
                      }`}
                    >
                      {v.options?.[option.title] || v.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}

            <div className="h-px bg-gray-100 w-full mb-6"></div>

            {/* Actions */}
            <div className="flex items-center gap-4 mb-8">
              <div className="flex items-center border border-gray-200 rounded-lg">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <Minus size={18} />
                </button>
                <div className="w-12 h-12 flex items-center justify-center font-bold text-gray-900">
                  {quantity}
                </div>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 flex items-center justify-center text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>

              <button className="flex-1 bg-[#4A5D23] text-white h-12 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-[#3A4A1A] transition-colors shadow-lg shadow-[#4A5D23]/20">
                <ShoppingCart size={20} />
                Add to Cart
              </button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-auto">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Truck className="text-[#4A5D23]" size={24} />
                <div>
                  <div className="text-xs font-bold text-gray-900">Fast Delivery</div>
                  <div className="text-[10px] text-gray-500">2-3 Business Days</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Leaf className="text-[#4A5D23]" size={24} />
                <div>
                  <div className="text-xs font-bold text-gray-900">100% Natural</div>
                  <div className="text-[10px] text-gray-500">No Preservatives</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <ShieldCheck className="text-[#4A5D23]" size={24} />
                <div>
                  <div className="text-xs font-bold text-gray-900">Secure Payment</div>
                  <div className="text-[10px] text-gray-500">256-bit Encryption</div>
                </div>
              </div>
            </div>
            
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-20">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900 font-playfair">You May Also Like</h2>
              <Link href="/shop" className="text-[#4A5D23] font-bold text-sm hover:underline">View All</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
              {relatedProducts.slice(0, 4).map((p, i) => (
                <div key={i}>
                  <ProductCard 
                    title={p.title}
                    weight={p.variants?.[0]?.options?.Weight || '1kg'}
                    price={p.variants?.[0]?.prices?.[0]?.amount || 0}
                    rating={5.0}
                    reviews={10}
                    img={p.images?.[0]?.url}
                    href={`/products/${p.handle}`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
