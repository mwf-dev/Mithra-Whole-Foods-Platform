"use client"

import { Popover, PopoverPanel, Transition } from "@headlessui/react"
import { ArrowRightMini } from "@medusajs/icons"
import { Text, clx, useToggleState } from "@medusajs/ui"
import { Fragment } from "react"
import { Menu } from "lucide-react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CountrySelect from "../country-select"
import LanguageSelect from "../language-select"
import { HttpTypes } from "@medusajs/types"
import { Locale } from "@lib/data/locales"

const SideMenuItems = {
  Home: "/",
  Store: "/store",
  Account: "/account",
  Cart: "/cart",
}

type SideMenuProps = {
  regions: HttpTypes.StoreRegion[] | null
  locales: Locale[] | null
  currentLocale: string | null
}

const SideMenu = ({ regions, locales, currentLocale }: SideMenuProps) => {
  const countryToggleState = useToggleState()
  const languageToggleState = useToggleState()

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex relative">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  className="relative h-full flex items-center transition-all ease-out duration-200 focus:outline-none hover:text-[#2E5C31] px-2"
                >
                  <Menu className="w-6 h-6 text-gray-800 hover:text-[#2E5C31] transition-colors" strokeWidth={1.5} />
                </Popover.Button>
              </div>

              {open && (
                <div
                  className="fixed inset-0 z-[50] bg-transparent pointer-events-auto"
                  onClick={close}
                  data-testid="side-menu-backdrop"
                />
              )}

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <PopoverPanel className="absolute top-full left-0 mt-4 w-64 z-[51] bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden text-gray-900">
                  <div
                    data-testid="nav-menu-popup"
                    className="flex flex-col p-4"
                  >
                    <ul className="flex flex-col gap-1">
                      {Object.entries(SideMenuItems).map(([name, href]) => {
                        return (
                          <li key={name}>
                            <LocalizedClientLink
                              href={href}
                              className="block px-4 py-3 hover:bg-green-50 hover:text-green-800 rounded-lg text-lg font-medium transition-colors"
                              onClick={close}
                              data-testid={`${name.toLowerCase()}-link`}
                            >
                              {name}
                            </LocalizedClientLink>
                          </li>
                        )
                      })}
                    </ul>
                    
                    <div className="flex flex-col gap-y-4 mt-4 pt-4 border-t border-gray-100 px-4">
                      {!!locales?.length && (
                        <div
                          className="flex justify-between items-center text-sm cursor-pointer"
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
                          className="flex justify-between items-center text-sm cursor-pointer"
                          onClick={countryToggleState.toggle}
                        >
                          <CountrySelect
                            toggleState={countryToggleState}
                            regions={regions}
                          />
                          <ArrowRightMini
                            className={clx(
                              "transition-transform duration-150",
                              countryToggleState.state ? "rotate-90" : ""
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </PopoverPanel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
