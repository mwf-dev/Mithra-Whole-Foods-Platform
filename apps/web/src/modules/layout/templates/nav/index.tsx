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
import CategoriesMenu from "@modules/layout/components/categories-menu"
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
      {/* One header row, logo-left: the one-line "Mithra Whole Foods" lockup
          is too wide to sit centred between two clusters, so it anchors the
          left edge, then Home · Shop · All Categories, then search, with
          account · wishlist · cart on the right. Phones: menu · logo · cart.
          Category navigation lives in the "All Categories" dropdown (and the
          phone drawer) — the homepage aisle discs already show every aisle,
          so a second category row only duplicated them. */}
      <header className="relative bg-white border-b border-ui-border-base">
        <div className="content-container flex items-center gap-3 md:gap-6 h-[72px] md:h-[96px]">
          <div className="md:hidden flex items-center h-full -ml-2">
            <SideMenu
              regions={regions}
              locales={locales}
              currentLocale={currentLocale}
              categories={topLevel}
            />
          </div>

          <Logo />

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-ui-fg-subtle shrink-0">
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
            <CategoriesMenu categories={topLevel} />
          </nav>

          <div className="flex-1 min-w-0 flex justify-center">
            <SearchBar className="hidden lg:flex items-center gap-2 w-full max-w-md bg-[#f8f8f8] rounded-full pl-5 pr-1.5 py-1.5" />
          </div>

          {/* Right: account · wishlist · cart. Phones: account and wishlist
              live in the drawer, so this is just the cart. */}
          <div className="flex items-center justify-end gap-x-3 md:gap-x-4 shrink-0">
            <LocalizedClientLink href="/account" className="hidden sm:flex flex-col items-center gap-1 text-xs text-ui-fg-subtle hover:text-primary transition-colors">
              <div className="bg-[#f8f8f8] p-2.5 rounded-full"><User size={20} strokeWidth={1.5} /></div>
              <span className="hidden xl:inline">Login</span>
            </LocalizedClientLink>

            <LocalizedClientLink href="/account/wishlist" className="hidden sm:flex flex-col items-center gap-1 text-xs text-ui-fg-subtle hover:text-primary transition-colors">
              <div className="bg-[#f8f8f8] p-2.5 rounded-full"><Heart size={20} strokeWidth={1.5} /></div>
              <span className="hidden xl:inline">Wishlist</span>
            </LocalizedClientLink>

            <Suspense
              fallback={
                <div className="flex flex-col items-center gap-1 text-xs text-ui-fg-subtle">
                  <div className="bg-[#f8f8f8] p-2.5 rounded-full"><ShoppingCart size={20} strokeWidth={1.5} /></div>
                  <span className="hidden xl:inline">Cart</span>
                </div>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </div>
      </header>
    </div>
  )
}
