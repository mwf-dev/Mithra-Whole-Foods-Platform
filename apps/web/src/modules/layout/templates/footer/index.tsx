import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default function Footer() {
  return (
    <footer className="bg-[#333333] w-full text-[#cccccc] py-10 mt-12">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Information */}
          <div className="flex flex-col gap-3">
            <h3 className="text-white font-semibold text-[14px] mb-1">Information</h3>
            <ul className="flex flex-col gap-2.5 text-[13px]">
              <li><LocalizedClientLink href="/terms-conditions" className="hover:text-white transition-colors">Terms & Conditions</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/delivery-information" className="hover:text-white transition-colors">Delivery Information</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/about-us" className="hover:text-white transition-colors">About Us</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/special-offers" className="hover:text-white transition-colors">Special Offers</LocalizedClientLink></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="flex flex-col gap-3">
            <h3 className="text-white font-semibold text-[14px] mb-1">Customer Service</h3>
            <ul className="flex flex-col gap-2.5 text-[13px]">
              <li><LocalizedClientLink href="/contact" className="hover:text-white transition-colors">Contact Us</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/returns" className="hover:text-white transition-colors">Returns</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/site-map" className="hover:text-white transition-colors">Site Map</LocalizedClientLink></li>
            </ul>
          </div>

          {/* Extras */}
          <div className="flex flex-col gap-3">
            <h3 className="text-white font-semibold text-[14px] mb-1">Extras</h3>
            <ul className="flex flex-col gap-2.5 text-[13px]">
              <li><LocalizedClientLink href="/brands" className="hover:text-white transition-colors">Brands</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/specials" className="hover:text-white transition-colors">Specials</LocalizedClientLink></li>
            </ul>
          </div>

          {/* My Account */}
          <div className="flex flex-col gap-3">
            <h3 className="text-white font-semibold text-[14px] mb-1">My Account</h3>
            <ul className="flex flex-col gap-2.5 text-[13px]">
              <li><LocalizedClientLink href="/account" className="hover:text-white transition-colors">My Account</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/account/orders" className="hover:text-white transition-colors">Order History</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/account/wishlist" className="hover:text-white transition-colors">Wish List</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/account/newsletter" className="hover:text-white transition-colors">Newsletter</LocalizedClientLink></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-[#444444] pt-6 flex flex-col md:flex-row justify-between text-[13px]">
          <p>MithraWholeFoods &copy; 2026</p>
        </div>
      </div>
    </footer>
  )
}
