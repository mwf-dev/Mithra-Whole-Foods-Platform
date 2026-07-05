import Link from 'next/link';
import { ArrowRight, PlayCircle } from 'lucide-react';
import type { HomepageSettings } from '@/services/medusa';
import { BACKEND_URL } from '@/services/medusa';

export function Hero({ settings }: { settings?: HomepageSettings | null }) {
  // Use settings data if available, otherwise fallback to defaults
  const title = settings?.hero_title || "Ancient Foods.\\nTimeless Nutrition.";
  const subtitle = settings?.hero_subtitle || "Premium quality traditional foods for a healthier you and a happier planet.";
  
  // Medusa local file module serves files under /uploads
  // We need to construct the full URL if the image URL is just a relative path
  let bgImage = "https://placehold.co/1920x800/e6efe8/2e5c31?text=Farm+Background+Image";
  if (settings?.hero_image_url) {
    bgImage = settings.hero_image_url;
    if (bgImage.startsWith('/')) {
      bgImage = `${BACKEND_URL}${bgImage}`;
    }
  }

  // Handle newlines in the title (like in the original hardcoded string)
  const formattedTitle = title.split('\\n').map((line, i, arr) => (
    <span key={i}>
      {line}
      {i < arr.length - 1 && <br />}
    </span>
  ));

  return (
    <section className="relative w-full h-[600px] md:h-[700px] flex items-center bg-gray-100 overflow-hidden">
      {/* Background Image Placeholder */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${bgImage}')` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/50 to-transparent"></div>

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 w-full z-10 flex flex-col justify-center h-full">
        <div className="max-w-2xl mt-12 md:mt-0">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.1] mb-6 font-playfair">
            {formattedTitle}
          </h1>
          <p className="text-gray-700 text-lg md:text-xl mb-10 leading-relaxed max-w-lg">
            {subtitle}
          </p>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/shop" className="bg-[#4A5D23] text-white px-8 py-3.5 rounded-full font-semibold hover:bg-[#3A4A1A] transition-all hover:shadow-lg flex items-center gap-2">
              Shop Now <ArrowRight size={18} />
            </Link>
            <button className="flex items-center gap-2 text-gray-800 font-semibold hover:text-[#4A5D23] transition-colors">
              <PlayCircle size={24} className="text-gray-500" />
              Our Story
            </button>
          </div>
        </div>

        {/* Floating Cards (Bottom Right) */}
        <div className="hidden md:flex absolute right-8 bottom-12 gap-4">
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg flex items-center gap-4 w-64">
             <div className="flex-1">
               <span className="font-bold text-gray-900 block leading-tight">20% OFF</span>
               <span className="text-xs text-gray-500 block mb-2">on Millets Collection</span>
               <Link href="/offers" className="text-xs font-bold text-gray-800 flex items-center gap-1 hover:text-[#4A5D23]">
                 Shop Now <ArrowRight size={12} />
               </Link>
             </div>
             <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" style={{ backgroundImage: "url('https://placehold.co/100x100/f3f7f4/2e5c31?text=Millets')" }}></div>
          </div>
          
          <div className="bg-white/90 backdrop-blur-sm p-4 rounded-2xl shadow-lg flex items-center gap-4 w-64">
             <div className="flex-1">
               <span className="font-bold text-gray-900 block leading-tight">New Arrival</span>
               <span className="text-xs text-gray-500 block mb-2">Cold Pressed Oils</span>
               <Link href="/category/oils" className="text-xs font-bold text-gray-800 flex items-center gap-1 hover:text-[#4A5D23]">
                 Shop Now <ArrowRight size={12} />
               </Link>
             </div>
             <div className="w-16 h-16 bg-gray-200 rounded-lg shrink-0" style={{ backgroundImage: "url('https://placehold.co/100x100/f3f7f4/2e5c31?text=Oil')" }}></div>
          </div>
        </div>
      </div>
    </section>
  );
}
