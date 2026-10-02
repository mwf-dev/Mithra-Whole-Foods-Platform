"use client"

import { Dialog, DialogPanel, DialogBackdrop } from "@headlessui/react"
import { ArrowRightMini } from "@medusajs/icons"
import { clx, useToggleState } from "@medusajs/ui"
import { useState } from "react"
import {
  ChevronRight,
  Heart,
  Home,
  Menu,
  ShoppingBag,
  ShoppingCart,
  User,
  X,
} from "lucide-react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { BrandLockup } from "@modules/layout/components/logo"
import SearchBar from "@modules/search/components/search-bar"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"
import { HttpTypes } from "@medusajs/types"
import { Locale } from "@lib/data/locales"

const PRIMARY_LINKS = [
  { name: "Home", href: "/", icon: Home, testId: "home-link" },
  { name: "All products", href: "/store", icon: ShoppingBag, testId: "store-link" },
]

const ACCOUNT_LINKS = [
  { name: "Account", href: "/account", icon: User, testId: "account-link" },
  { name: "Wishlist", href: "/account/wishlist", icon: Heart, testId: "wishlist-link" },
  { name: "Cart", href: "/cart", icon: ShoppingCart, testId: "cart-link" },
]

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
  categories: HttpTypes.StoreProductCategory[]
}

/**
 * Phone navigation: a full-height drawer that slides in from the left. It is
 * the only navigation on phones (the header there is just menu · logo ·
 * cart), so it carries everything — search, Home, All products, every
 * category, account links and the region/language pickers.
 */
const SideMenu = ({ regions, locales, currentLocale, categories }: SideMenuProps) => {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()

  const rowClass =
    "flex items-center gap-3 rounded-rounded px-3 py-3 text-base font-medium text-charcoal transition-colors hover:bg-primary/10 hover:text-primary"

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        data-testid="nav-menu-button"
        className="flex h-full items-center px-2 text-gray-800 transition-colors hover:text-primary focus:outline-none"
      >
        <Menu className="h-6 w-6" strokeWidth={1.5} />
      </button>

      <Dialog open={open} onClose={close} className="relative z-[100]">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-black/40 transition-opacity duration-300 ease-out data-[closed]:opacity-0"
          data-testid="side-menu-backdrop"
        />

        <div className="fixed inset-0 flex">
          <DialogPanel
            transition
            className="flex h-full w-[86vw] max-w-sm flex-col bg-white shadow-card-xl transition-transform duration-300 ease-out data-[closed]:-translate-x-full"
            data-testid="nav-menu-popup"
          >
            <div className="flex items-center justify-between border-b border-beige px-4 py-3">
              <LocalizedClientLink href="/" onClick={close} aria-label="Mithra Whole Foods — home">
                <BrandLockup />
              </LocalizedClientLink>
              <button
                type="button"
                onClick={close}
                aria-label="Close menu"
                className="grid h-9 w-9 place-items-center rounded-full text-charcoal hover:bg-grey-5"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-4">
              {/* The header has no search on phones; this is its home. Submitting
                  navigates, so the drawer closes with it. */}
              <div onSubmit={close} className="px-1 pb-3">
                <SearchBar className="flex w-full items-center gap-2 rounded-full bg-[#f8f8f8] pl-4 pr-1.5 py-1.5" />
              </div>

              <ul className="flex flex-col">
                {PRIMARY_LINKS.map(({ name, href, icon: Icon, testId }) => (
                  <li key={name}>
                    <LocalizedClientLink href={href} onClick={close} className={rowClass} data-testid={testId}>
                      <Icon size={18} strokeWidth={1.75} aria-hidden />
                      {name}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>

              {categories.length > 0 && (
                <>
                  <p className="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-grey-50">
                    Categories
                  </p>
                  <ul className="flex flex-col">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <LocalizedClientLink
                          href={`/categories/${category.handle}`}
                          onClick={close}
                          className="flex items-center justify-between rounded-rounded px-3 py-2.5 text-sm text-charcoal transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          {category.name}
                          <ChevronRight size={16} className="text-grey-40" aria-hidden />
                        </LocalizedClientLink>
                      </li>
                    ))}
                  </ul>
                </>
              )}

              <ul className="mt-4 flex flex-col border-t border-beige pt-3">
                {ACCOUNT_LINKS.map(({ name, href, icon: Icon, testId }) => (
                  <li key={name}>
                    <LocalizedClientLink href={href} onClick={close} className={rowClass} data-testid={testId}>
                      <Icon size={18} strokeWidth={1.75} aria-hidden />
                      {name}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </div>

            {(!!locales?.length || regions) && (
              <div className="flex flex-col gap-y-4 border-t border-beige px-6 py-4">
                {!!locales?.length && (
                  <div
                    className="flex cursor-pointer items-center justify-between text-sm"
                    onClick={languageToggleState.toggle}
                  >
                    <LanguageSelect
                      toggleState={languageToggleState}
                      locales={locales}
                      currentLocale={currentLocale}
                    />
                    <ArrowRightMini
                      className={clx(
                        "transition-transform duration-150",
                        languageToggleState.state ? "rotate-90" : ""
                      )}
                    />
                  </div>
                )}
                {regions && (
                  <div
                    className="flex cursor-pointer items-center justify-between text-sm"
                    onClick={countryToggleState.toggle}
                  >
                    <CountrySelect toggleState={countryToggleState} regions={regions} />
                    <ArrowRightMini
                      className={clx(
                        "transition-transform duration-150",
                        countryToggleState.state ? "rotate-90" : ""
                      )}
                    />
                  </div>
                )}
              </div>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </>
  )
}

export default SideMenu
