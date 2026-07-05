import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { HomepageSettings } from '@/services/medusa';
import { BACKEND_URL } from '@/services/medusa';

export function Collections({ settings }: { settings?: HomepageSettings | null }) {
  let img1 = settings?.promo_card_1_url || 'https://placehold.co/200x200/f3eef0/c09a9a?text=Breakfast';
  if (img1.startsWith('/')) img1 = `${BACKEND_URL}${img1}`;
  
  let img2 = settings?.promo_card_2_url || 'https://placehold.co/200x200/f2ece1/b39a7a?text=Millets';
  if (img2.startsWith('/')) img2 = `${BACKEND_URL}${img2}`;

  const collections = [
    {
      title: settings?.promo_card_1_title || 'Breakfast Essentials',
      desc: 'Start your day the healthy way',
      bg: 'bg-[#F3EEF0]',
      img: img1
    },
    {
      title: settings?.promo_card_2_title || 'Millet Collection',
      desc: 'Wholesome millets for every meal',
      bg: 'bg-[#F2ECE1]',
      img: img2
    },
    {
      title: 'Natural Sweeteners',
      desc: 'Healthier alternatives for your family',
      bg: 'bg-[#F4EBE6]',
      img: 'https://placehold.co/200x200/f4ebe6/b68c78?text=Sweeteners'
    },
    {
      title: 'Healthy Snacks',
      desc: 'Tasty & nutritious snacking options',
      bg: 'bg-[#EBF1ED]',
      img: 'https://placehold.co/200x200/ebf1ed/8b9a8f?text=Snacks'
    }
  ];

  return (
    <section className="py-12 bg-white text-center">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-10 relative">
          <div className="flex justify-center items-center gap-2 text-[#4A5D23] mb-2">
            <span className="w-4 h-px bg-[#4A5D23]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#4A5D23]"></span>
            <span className="w-4 h-px bg-[#4A5D23]"></span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 font-playfair mb-2">Healthy Living Collections</h2>
          <p className="text-gray-500 text-sm">Curated for your healthy lifestyle</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((coll, i) => (
            <div key={i} className={`${coll.bg} rounded-2xl p-6 relative overflow-hidden flex flex-col justify-center min-h-[180px] group cursor-pointer text-left`}>
              <div className="relative z-10 w-[60%]">
                <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">{coll.title}</h3>
                <p className="text-xs text-gray-600 mb-4 pr-2">{coll.desc}</p>
                <Link href="/shop" className="text-xs font-bold text-gray-900 flex items-center gap-1 group-hover:gap-2 group-hover:text-[#4A5D23] transition-all">
                  Shop Now <ArrowRight size={14} />
                </Link>
              </div>
              <div 
                className="absolute right-0 bottom-0 w-32 h-32 bg-contain bg-bottom bg-no-repeat -mb-2 -mr-2 group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url('${coll.img}')` }}
              ></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
