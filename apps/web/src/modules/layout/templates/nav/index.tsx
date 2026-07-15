import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listCategories } from "@lib/data/categories"
import { StoreRegion } from "@medusajs/types"
import { Heart, User, ShoppingCart } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import Logo from "@modules/layout/components/logo"
import CategoryBar from "@modules/layout/components/category-bar"
import SearchBar from "@modules/search/components/search-bar"

export default async function Nav() {
  const [regions, locales, currentLocale, categories] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
    listCategories().catch(() => []),
  ])

  // Surface every top-level category that actually has products, so the
  // storefront exposes the full catalog (parity with the old site) instead
  // of an arbitrary first-8. The category bar scrolls horizontally.
  const topLevel = (categories ?? [])
    .filter((c) => !c.parent_category && (c.products?.length ?? 0) > 0)

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      {/* Primary row: logo · account · cart */}
      <header className="relative bg-white border-b border-ui-border-base">
        <div className="content-container flex items-center justify-between h-16 md:h-[72px]">
          {/* Left: mobile menu trigger, logo + Home, Shop */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1">
              <div className="md:hidden flex items-center h-full -ml-2">
                <SideMenu
                  regions={regions}
                  locales={locales}
                  currentLocale={currentLocale}
                />
              </div>
              <Logo />
            </div>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ui-fg-subtle">
              <LocalizedClientLink
                href="/"
                className="hover:text-[#2E5C31] transition-colors"
                data-testid="nav-home-link"
              >
                Home
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/store"
                className="hover:text-[#2E5C31] transition-colors"
                data-testid="nav-store-link"
              >
                Shop
              </LocalizedClientLink>
            </nav>
          </div>

          {/* Right: search + account + wishlist + cart */}
          <div className="flex items-center gap-x-4 md:gap-x-6 flex-1 justify-end">
             {/* Search Bar */}
             <SearchBar />

             {/* Icons */}
             <div className="flex items-center gap-x-4">
                <LocalizedClientLink href="/account" className="flex flex-col items-center gap-1 text-xs text-ui-fg-subtle hover:text-[#2E5C31] transition-colors">
                  <div className="bg-[#f8f8f8] p-2.5 rounded-full"><User size={20} strokeWidth={1.5} /></div>
                  <span className="hidden lg:inline">Login</span>
                </LocalizedClientLink>
                
                <LocalizedClientLink href="/store" className="flex flex-col items-center gap-1 text-xs text-ui-fg-subtle hover:text-[#2E5C31] transition-colors">
                  <div className="bg-[#f8f8f8] p-2.5 rounded-full"><Heart size={20} strokeWidth={1.5} /></div>
                  <span className="hidden lg:inline">Wishlist</span>
                </LocalizedClientLink>

                <Suspense
                  fallback={
                    <div className="flex flex-col items-center gap-1 text-xs text-ui-fg-subtle">
                      <div className="bg-[#f8f8f8] p-2.5 rounded-full"><ShoppingCart size={20} strokeWidth={1.5} /></div>
                      <span className="hidden lg:inline">Cart</span>
                    </div>
                  }
                >
                  <CartButton />
                </Suspense>
             </div>
          </div>
        </div>
      </header>

      {/* Secondary row: category navigation (desktop) */}
      <CategoryBar categories={topLevel} />
    </div>
  )
}
