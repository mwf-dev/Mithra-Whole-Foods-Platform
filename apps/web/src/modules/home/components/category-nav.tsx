import Link from 'next/link';
import { Menu, ChevronDown } from 'lucide-react';

export function CategoryNav() {
  const categories = [
    { name: 'Millets', href: '/shop?category=Millets' },
    { name: 'Rice & Dals', href: '/shop?category=Rice%20%26%20Dals' },
    { name: 'Cold Pressed Oils', href: '/shop?category=Cold%20Pressed%20Oils' },
    { name: 'Ghee', href: '/shop?category=Ghee' },
    { name: 'Health Mixes', href: '/shop?category=Health%20Mixes' },
    { name: 'Natural Sweeteners', href: '/shop?category=Natural%20Sweeteners' },
    { name: 'Herbs & Spices', href: '/shop?category=Herbs%20%26%20Spices' },
  ];

  return (
    <div className="border-b border-gray-100 bg-white hidden md:block">
      <div className="max-w-7xl mx-auto px-8 py-3 flex items-center gap-8">
        
        {/* Shop by Category Button */}
        <button className="flex items-center gap-2 bg-[#F3F7F4] text-[#2E5C31] px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#E8F0EA] transition-colors flex-shrink-0">
          <Menu size={18} />
          Shop by Category
        </button>

        {/* Category Links */}
        <nav className="flex-1 flex items-center justify-between overflow-x-auto no-scrollbar gap-4">
          {categories.map((category) => (
            <Link 
              key={category.name} 
              href={category.href}
              className="text-gray-700 font-semibold text-sm whitespace-nowrap hover:text-[#2E5C31] transition-colors"
            >
              {category.name}
            </Link>
          ))}
          <button className="flex items-center gap-1 text-gray-700 font-semibold text-sm whitespace-nowrap hover:text-[#2E5C31] transition-colors">
            More <ChevronDown size={14} />
          </button>
        </nav>

      </div>
    </div>
  );
}
