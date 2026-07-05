import { Star, ShoppingCart } from 'lucide-react';
import Link from 'next/link';

interface ProductCardProps {
  title: string;
  weight: string;
  price: number;
  originalPrice?: number | null;
  rating: number;
  reviews: number;
  isNew?: boolean;
  img?: string;
}

export function ProductCard({ title, weight, price, originalPrice, rating, reviews, isNew, img }: ProductCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-xl hover:border-gray-200 transition-all duration-300 flex flex-col group h-full">
      
      {/* Image Container */}
      <div className="relative aspect-[4/5] bg-gray-50/50 rounded-lg mb-4 overflow-hidden flex items-center justify-center">
        {/* Placeholder for Product Image */}
        <div 
          className="absolute inset-0 bg-contain bg-center bg-no-repeat group-hover:scale-105 transition-transform duration-500 m-4"
          style={{ backgroundImage: `url(${img || 'https://placehold.co/200x250/ffffff/d4d4d4'})` }}
        ></div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col">
        {/* Rating */}
        <div className="flex items-center gap-1 mb-2">
          <div className="flex text-[#D4AF37]">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-current" />
            ))}
          </div>
          <span className="text-[10px] text-gray-500">({reviews})</span>
        </div>

        {/* Title & Weight */}
        <Link href="#" className="flex-1 mb-2">
          <h4 className="font-bold text-gray-900 leading-tight mb-1 group-hover:text-[#4A5D23] transition-colors line-clamp-2 text-sm">
            {title}
          </h4>
          <span className="text-[11px] text-gray-500">{weight}</span>
        </Link>

        {/* Price */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">${price.toFixed(2)}</span>
          {originalPrice && (
            <span className="text-xs text-gray-400 line-through">${originalPrice.toFixed(2)}</span>
          )}
        </div>

        {/* Add to Cart Action */}
        <button className="w-full bg-[#4A5D23] text-white hover:bg-[#3A4A1A] py-2 rounded flex items-center justify-center gap-2 text-xs font-bold transition-colors">
          Add To Cart
        </button>
      </div>
    </div>
  );
}
