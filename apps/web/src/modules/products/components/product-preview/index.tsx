import { Star, ShoppingCart } from 'lucide-react';
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

export default function ProductPreview({ 
  product,
  region
}: { 
  product: HttpTypes.StoreProduct, 
  region: HttpTypes.StoreRegion 
}) {
  const { cheapestPrice } = getProductPrice({
    product,
  })

  // Format price
  const price = cheapestPrice?.calculated_price_number || 0;
  const originalPrice = cheapestPrice?.original_price_number || null;
  const currencyCode = region.currency_code || 'USD';
  
  // Create formatter based on currency code
  const priceFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
  });

  const weight = product.variants?.[0]?.title || '1kg';
  const img = product.thumbnail || product.images?.[0]?.url || 'https://placehold.co/200x250/ffffff/d4d4d4?text=Product';
  const href = `/products/${product.handle}`;
  const reviews = 10; // Dummy value

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-xl hover:border-gray-200 transition-all duration-300 flex flex-col group h-full">
      
      {/* Image Container */}
      <LocalizedClientLink href={href} className="relative aspect-[4/5] bg-gray-50/50 rounded-lg mb-4 overflow-hidden flex items-center justify-center block">
        {/* Placeholder for Product Image */}
        <div 
          className="absolute inset-0 bg-contain bg-center bg-no-repeat group-hover:scale-105 transition-transform duration-500 m-4"
          style={{ backgroundImage: `url(${img})` }}
        ></div>
      </LocalizedClientLink>

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
        <LocalizedClientLink href={href} className="flex-1 mb-2">
          <h4 className="font-bold text-gray-900 leading-tight mb-1 group-hover:text-[#4A5D23] transition-colors line-clamp-2 text-sm">
            {product.title}
          </h4>
          <span className="text-[11px] text-gray-500">{weight}</span>
        </LocalizedClientLink>

        {/* Price */}
        <div className="mb-4 flex items-center gap-2">
          <span className="text-lg font-bold text-gray-900">{priceFormatter.format(price)}</span>
          {originalPrice && originalPrice > price && (
            <span className="text-xs text-gray-400 line-through">{priceFormatter.format(originalPrice)}</span>
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
