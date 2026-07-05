import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-white pt-16 pb-8 border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8 mb-12">
          
          {/* Logo & Description */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex flex-col items-start flex-shrink-0 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#4A5D23] rounded-bl-xl rounded-tr-xl flex items-center justify-center text-white font-bold">M</div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold tracking-tight text-gray-900 leading-none">MITHRA</span>
                  <span className="text-[9px] uppercase tracking-widest text-gray-500 font-medium">Whole Foods</span>
                </div>
              </div>
            </Link>
            <p className="text-gray-500 text-xs leading-relaxed max-w-xs">
              Traditional foods made with love, for a healthier and happier tomorrow.
            </p>
            {/* Social Icons Placeholder */}
            <div className="flex gap-3 mt-6">
               <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#4A5D23] hover:border-[#4A5D23] cursor-pointer transition-colors">f</div>
               <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#4A5D23] hover:border-[#4A5D23] cursor-pointer transition-colors">in</div>
               <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#4A5D23] hover:border-[#4A5D23] cursor-pointer transition-colors">yt</div>
               <div className="w-8 h-8 rounded-full border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#4A5D23] hover:border-[#4A5D23] cursor-pointer transition-colors">ig</div>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-bold text-gray-900 mb-4 text-sm">Shop</h4>
            <ul className="space-y-3">
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">All Products</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Millets</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Oils</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Ghee</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Health Mixes</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Combo Packs</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-gray-900 mb-4 text-sm">Help</h4>
            <ul className="space-y-3">
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">FAQs</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Shipping Policy</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Returns & Refunds</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Track Order</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Contact Us</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-4 text-sm">About</h4>
            <ul className="space-y-3">
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">About Us</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Our Farmers</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Sustainability</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Blogs & Recipes</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 mb-4 text-sm">Account</h4>
            <ul className="space-y-3">
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">My Account</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Orders</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Wishlist</Link></li>
              <li><Link href="#" className="text-gray-500 text-xs hover:text-[#4A5D23]">Addresses</Link></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-gray-400 text-[10px]">© 2026 Mithra Whole Foods. All rights reserved.</p>
          {/* Payment Icons Placeholder */}
          <div className="flex gap-2">
             <div className="w-8 h-5 bg-gray-100 rounded"></div>
             <div className="w-8 h-5 bg-gray-100 rounded"></div>
             <div className="w-8 h-5 bg-gray-100 rounded"></div>
             <div className="w-8 h-5 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    </footer>
  );
}
