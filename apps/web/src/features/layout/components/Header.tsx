import Link from 'next/link';
import { Search, User, Heart, ShoppingCart } from 'lucide-react';

export function Header() {
  return (
    <header className="py-4 px-4 md:px-8 border-b border-gray-100 bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 md:gap-8">
        
        {/* Logo */}
        <Link href="/" className="flex flex-col items-start flex-shrink-0">
          <div className="flex items-center gap-2">
            {/* Placeholder for SVG leaf logo */}
            <div className="w-8 h-8 bg-green-800 rounded-bl-xl rounded-tr-xl flex items-center justify-center text-white font-bold">M</div>
            <div className="flex flex-col">
              <span className="text-xl md:text-2xl font-bold tracking-tight text-gray-900 leading-none">MITHRA</span>
              <span className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">Whole Foods</span>
            </div>
          </div>
        </Link>

        {/* Navigation - desktop */}
        <nav className="hidden lg:flex items-center gap-6">
          <Link href="/shop" className="text-sm font-bold text-gray-700 hover:text-[#2E5C31]">Shop</Link>
          <Link href="/shop" className="text-sm font-bold text-gray-700 hover:text-[#2E5C31]">Categories</Link>
          <Link href="#" className="text-sm font-bold text-gray-700 hover:text-[#2E5C31]">About Us</Link>
        </nav>

        {/* Search Bar - Hidden on small screens, flex on large */}
        <div className="hidden md:flex flex-1 max-w-2xl items-center relative">
          <input 
            type="text" 
            placeholder="Search for millets, oils, rice, health mixes..." 
            className="w-full bg-gray-50 border border-gray-200 rounded-full py-3 px-6 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E5C31]/20 focus:border-[#2E5C31] transition-all"
          />
          <button className="absolute right-1 top-1 bottom-1 bg-[#2E5C31] text-white p-2 rounded-full hover:bg-[#234825] transition-colors flex items-center justify-center aspect-square">
            <Search size={18} />
          </button>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-4 md:gap-6 flex-shrink-0">
          <button className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#2E5C31] transition-colors">
            <User size={24} strokeWidth={1.5} />
            <span className="text-[10px] font-medium hidden md:block">Login</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#2E5C31] transition-colors">
            <Heart size={24} strokeWidth={1.5} />
            <span className="text-[10px] font-medium hidden md:block">Wishlist</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-gray-600 hover:text-[#2E5C31] transition-colors relative">
            <div className="relative">
              <ShoppingCart size={24} strokeWidth={1.5} />
              <span className="absolute -top-1 -right-1.5 bg-[#2E5C31] text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                3
              </span>
            </div>
            <span className="text-[10px] font-medium hidden md:block">Cart</span>
          </button>
        </div>
      </div>
      
      {/* Mobile Search Bar - Visible only on small screens */}
      <div className="md:hidden mt-4 flex items-center relative">
        <input 
          type="text" 
          placeholder="Search for millets..." 
          className="w-full bg-gray-50 border border-gray-200 rounded-full py-2.5 px-4 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-[#2E5C31]/20 focus:border-[#2E5C31] transition-all"
        />
        <button className="absolute right-1 top-1 bottom-1 bg-[#2E5C31] text-white p-2 rounded-full hover:bg-[#234825] transition-colors flex items-center justify-center aspect-square">
          <Search size={16} />
        </button>
      </div>
    </header>
  );
}
