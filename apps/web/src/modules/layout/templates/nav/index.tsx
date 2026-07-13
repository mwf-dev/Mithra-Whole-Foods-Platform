import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listCategories } from "@lib/data/categories"
import { StoreRegion } from "@medusajs/types"
import { User } from "lucide-react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import Logo from "@modules/layout/components/logo"
import CategoryBar from "@modules/layout/components/category-bar"

export default async function Nav() {
  const [regions, locales, currentLocale, categories] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
    listCategories().catch(() => []),
  ])

  const topLevel = (categories ?? [])
    .filter((c) => !c.parent_category)
    .slice(0, 8)

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      {/* Primary row: logo · account · cart */}
      <header className="relative bg-white border-b border-ui-border-base">
        <div className="content-container flex items-center justify-between h-16 md:h-[72px]">
          {/* Left: mobile menu trigger + logo */}
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

          {/* Center: primary desktop links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-ui-fg-subtle">
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

          {/* Right: account + cart */}
          <div className="flex items-center gap-x-5 md:gap-x-6">
            <LocalizedClientLink
              href="/account"
              className="hidden sm:flex items-center gap-2 text-sm text-ui-fg-subtle hover:text-[#2E5C31] transition-colors"
              data-testid="nav-account-link"
            >
              <User size={18} strokeWidth={1.8} />
              <span className="hidden lg:inline">Account</span>
            </LocalizedClientLink>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-[#2E5C31] flex gap-2 text-sm text-ui-fg-subtle"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  Cart (0)
                </LocalizedClientLink>
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
