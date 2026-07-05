import Link from 'next/link';

export function TopBanner() {
  return (
    <div className="bg-[#2E5C31] text-white text-xs md:text-sm font-medium py-2 px-4 md:px-8 flex justify-between items-center">
      <div className="flex-1">
        <span>Free shipping on orders above ₹999</span>
      </div>
      <nav className="hidden md:flex gap-6">
        <Link href="/about" className="hover:text-gray-200 transition-colors">
          About Us
        </Link>
        <Link href="/farms" className="hover:text-gray-200 transition-colors">
          Our Farms
        </Link>
        <Link href="/contact" className="hover:text-gray-200 transition-colors">
          Contact Us
        </Link>
      </nav>
    </div>
  );
}
