"use client"

import { Button } from "@medusajs/ui"
import { X } from "lucide-react"
import { usePathname } from "next/navigation"
import { useEffect, useState, useTransition } from "react"

import { dismissWelcomePrompt } from "@lib/data/welcome-prompt"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/** Long enough to read the page first; short enough to still feel like a greeting. */
const DELAY_MS = 3500

/**
 * A one-time invitation for guests to sign in, shown shortly after arrival.
 *
 * Deliberately dismissible: shoppers can browse and fill a cart without an
 * account, and only checkout requires one. Walling off the catalogue would cost
 * far more in abandoned visits than it would win in signups.
 *
 * Only rendered for signed-out visitors who haven't dismissed it before — the
 * layout decides that on the server, so this never flashes for anyone else.
 */
export default function WelcomeSignInPrompt() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [, startTransition] = useTransition()

  // Nothing to invite them to while they're already on the sign-in page.
  const onAccountPage = pathname?.includes("/account")

  useEffect(() => {
    if (onAccountPage) {
      return
    }

    const timer = setTimeout(() => setVisible(true), DELAY_MS)
    return () => clearTimeout(timer)
  }, [onAccountPage])

  const dismiss = () => {
    setVisible(false)
    startTransition(() => {
      dismissWelcomePrompt()
    })
  }

  useEffect(() => {
    if (!visible) {
      return
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismiss()
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  if (!visible || onAccountPage) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={dismiss}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-prompt-title"
        className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
        >
          <X size={18} />
        </button>

        <h2
          id="welcome-prompt-title"
          className="pr-8 font-playfair text-2xl font-bold text-gray-900"
        >
          Welcome to Mithra Whole Foods
        </h2>

        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Sign in for a faster checkout, your saved addresses, and a cart that
          follows you from your phone to your laptop.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <LocalizedClientLink
            href={`/account?redirect=${encodeURIComponent(pathname ?? "/")}`}
            onClick={dismiss}
          >
            <Button className="h-12 w-full rounded-full text-base font-semibold">
              Sign in or create an account
            </Button>
          </LocalizedClientLink>

          <button
            type="button"
            onClick={dismiss}
            className="text-sm font-medium text-gray-500 underline-offset-4 transition-colors hover:text-gray-900 hover:underline"
          >
            Continue browsing
          </button>
        </div>
      </div>
    </div>
  )
}
