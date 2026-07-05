import Link from 'next/link';

export function ShopByCategory({ categories = [] }: { categories?: any[] }) {
  const displayCategories = categories.length > 0 ? categories.map(c => ({
    name: c.name,
    sub: `${c.products?.length || 0} Products`,
    img: `https://placehold.co/150x150/fdfbf7/a99479?text=${encodeURIComponent(c.name)}`
  })) : [
    { name: 'Millets', sub: '32 Products', img: 'https://placehold.co/150x150/fdfbf7/a99479?text=Millets' },
    { name: 'Traditional Rice', sub: '28 Products', img: 'https://placehold.co/150x150/fdfbf7/a99479?text=Rice' },
    { name: 'Cold Pressed Oils', sub: '18 Products', img: 'https://placehold.co/150x150/fdfbf7/a99479?text=Oils' },
    { name: 'Ghee', sub: '12 Products', img: 'https://placehold.co/150x150/fdfbf7/a99479?text=Ghee' },
    { name: 'Health Mixes', sub: '20 Products', img: 'https://placehold.co/150x150/fdfbf7/a99479?text=Mixes' },
    { name: 'Sweeteners', sub: '10 Products', img: 'https://placehold.co/150x150/fdfbf7/a99479?text=Sweet' },
    { name: 'Snacks', sub: '25 Products', img: 'https://placehold.co/150x150/fdfbf7/a99479?text=Snacks' },
    { name: 'Combo Packs', sub: '15 Products', img: 'https://placehold.co/150x150/fdfbf7/a99479?text=Combos' },
  ];

  return (
    <section className="py-16 bg-white overflow-hidden text-center">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="mb-10 relative">
          <div className="flex justify-center items-center gap-2 text-[#4A5D23] mb-2">
            <span className="w-4 h-px bg-[#4A5D23]"></span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#4A5D23]"></span>
            <span className="w-4 h-px bg-[#4A5D23]"></span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900 font-playfair mb-2">Shop by Category</h2>
          <p className="text-gray-500 text-sm">Explore our wide range of traditional and natural foods</p>
        </div>
        
        {/* Horizontal scroll container */}
        <div className="flex overflow-x-auto gap-4 md:gap-8 pb-8 no-scrollbar snap-x justify-start md:justify-center">
          {displayCategories.map((cat, i) => (
            <div key={i} className="flex flex-col items-center gap-3 snap-start group cursor-pointer flex-shrink-0 w-[120px]">
              <div 
                className="w-24 h-24 md:w-28 md:h-28 rounded-full flex items-center justify-center group-hover:shadow-xl group-hover:-translate-y-1 transition-all duration-300 relative overflow-hidden bg-center bg-cover border-4 border-white shadow-sm"
                style={{ backgroundImage: `url(${cat.img})` }}
              >
              </div>
              <div className="text-center">
                 <span className="font-bold text-gray-800 text-sm group-hover:text-[#4A5D23] transition-colors block leading-tight">{cat.name}</span>
                 <span className="text-xs text-gray-400">{cat.sub}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
