import { Mail, MapPin, Phone } from "lucide-react"
import Image from "next/image"

import { BUSINESS, mapsUrl } from "@lib/business"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const linkClass = "transition-colors hover:text-white"

/**
 * Only links to pages that exist. Terms, privacy, delivery and returns pages
 * are not built yet (they need wording from the client) — add them here when
 * they are, rather than linking to a 404.
 */
export default function Footer() {
  return (
    <footer className="mt-12 w-full bg-charcoal py-12 text-[#cccccc]">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-10 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          {/* Brand + contact, as on the client's business card */}
          <div className="flex flex-col gap-4">
            {/* The client's wordmark, light version for the dark footer. */}
            <Image
              src="/brand/mithra-wordmark-light.svg"
              alt={`${BUSINESS.name} — ${BUSINESS.tagline}`}
              width={336}
              height={83.4}
              unoptimized
              className="h-[72px] w-auto self-start"
            />
            <address className="flex flex-col gap-2.5 text-[13px] not-italic">
              <span className="font-semibold text-white">{BUSINESS.legalName}</span>
              <a
                href={mapsUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-start gap-2.5 ${linkClass}`}
              >
                <MapPin size={16} className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  {BUSINESS.address.street}
                  <br />
                  {BUSINESS.address.city}, {BUSINESS.address.region} {BUSINESS.address.postalCode}
                </span>
              </a>
              <a href={`tel:${BUSINESS.phoneTel}`} className={`flex items-center gap-2.5 ${linkClass}`}>
                <Phone size={16} className="shrink-0" aria-hidden />
                {BUSINESS.phoneDisplay}
              </a>
              <a href={`mailto:${BUSINESS.email}`} className={`flex items-center gap-2.5 break-all ${linkClass}`}>
                <Mail size={16} className="shrink-0" aria-hidden />
                {BUSINESS.email}
              </a>
            </address>
          </div>

          <nav aria-label="Shop" className="flex flex-col gap-3">
            <h3 className="mb-1 text-[14px] font-semibold text-white">Shop</h3>
            <ul className="flex flex-col gap-2.5 text-[13px]">
              <li><LocalizedClientLink href="/store" className={linkClass}>All products</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/categories/ghee" className={linkClass}>Ghee</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/categories/cold-pressed-oils" className={linkClass}>Cold pressed oils</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/search" className={linkClass}>Search</LocalizedClientLink></li>
            </ul>
          </nav>

          <nav aria-label="Company" className="flex flex-col gap-3">
            <h3 className="mb-1 text-[14px] font-semibold text-white">Company</h3>
            <ul className="flex flex-col gap-2.5 text-[13px]">
              <li><LocalizedClientLink href="/about-us" className={linkClass}>About us</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/contact" className={linkClass}>Contact us</LocalizedClientLink></li>
            </ul>
          </nav>

          <nav aria-label="My account" className="flex flex-col gap-3">
            <h3 className="mb-1 text-[14px] font-semibold text-white">My account</h3>
            <ul className="flex flex-col gap-2.5 text-[13px]">
              <li><LocalizedClientLink href="/account" className={linkClass}>My account</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/account/orders" className={linkClass}>Order history</LocalizedClientLink></li>
              <li><LocalizedClientLink href="/account/wishlist" className={linkClass}>Wish list</LocalizedClientLink></li>
            </ul>
          </nav>
        </div>

        <div className="border-t border-[#4a4a4a] pt-6 text-[13px]">
          <p>&copy; {new Date().getFullYear()} {BUSINESS.legalName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
