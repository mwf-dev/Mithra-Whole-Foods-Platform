import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listCategories } from "@lib/data/categories"
import { swallow } from "@lib/observability/report"
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
    listCategories().catch(swallow([], "nav.listCategories")),
  ])

  // Surface every top-level category that actually has products, so the
  // storefront exposes the full catalog (parity with the old site) instead
  // of an arbitrary first-8. The category bar scrolls horizontally.
  const topLevel = (categories ?? [])
    .filter((c) => !c.parent_category && (c.products?.length ?? 0) > 0)

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      {/* Primary row, centred-logo layout (as Two Brothers): links and
          search on the left, the Mithra lockup in the middle, account ·
          wishlist · cart on the right. A 1fr/auto/1fr grid keeps the logo
          truly centred however wide the two sides are. */}
      <header className="relative bg-white border-b border-ui-border-base">
        <div className="content-container grid grid-cols-[1fr_auto_1fr] items-center gap-3 h-[76px] md:h-[96px]">
          {/* Left: mobile menu · Home, Shop · search */}
          <div className="flex min-w-0 items-center gap-5">
            <div className="md:hidden flex items-center h-full -ml-2">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
              />
            </div>

            <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ui-fg-subtle">
              {/* Every route reads cookies, so it renders dynamically and
                  Link's default prefetch only reaches the loading skeleton.
                  These two are the highest-intent links on the site and both
                  dedupe to a single URL, so paying for a full prefetch here
                  buys an instant transition cheaply. Deliberately not applied
                  to product grids: one full render per card would flood the
                  backend for cards most shoppers never click. */}
              <LocalizedClientLink
                href="/"
                prefetch
                className="hover:text-primary transition-colors"
                data-testid="nav-home-link"
              >
                Home
              </LocalizedClientLink>
              <LocalizedClientLink
                href="/store"
                prefetch
                className="hover:text-primary transition-colors"
                data-testid="nav-store-link"
              >
                Shop
              </LocalizedClientLink>
            </nav>

            <SearchBar className="hidden lg:flex items-center min-w-0 max-w-[17rem] flex-1 bg-[#f8f8f8] rounded-full pl-4 pr-1.5 py-1.5" />
          </div>

          {/* Centre: logo */}
          <Logo />

          {/* Right: account · wishlist · cart */}
          <div className="flex items-center justify-end gap-x-3 md:gap-x-4">
            {/* Phones: account lives in the side menu, so the right side is
                just the cart and balances the menu button — which keeps the
                logo optically centred. */}
            <LocalizedClientLink href="/account" className="hidden sm:flex flex-col items-center gap-1 text-xs text-ui-fg-subtle hover:text-primary transition-colors">
              <div className="bg-[#f8f8f8] p-2.5 rounded-full"><User size={20} strokeWidth={1.5} /></div>
              <span className="hidden lg:inline">Login</span>
            </LocalizedClientLink>

            <LocalizedClientLink href="/account/wishlist" className="hidden sm:flex flex-col items-center gap-1 text-xs text-ui-fg-subtle hover:text-primary transition-colors">
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
      </header>

      {/* Secondary row: category navigation (desktop) */}
      <CategoryBar categories={topLevel} />
    </div>
  )
}
