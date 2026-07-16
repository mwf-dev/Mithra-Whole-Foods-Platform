"use client"

import { Button } from "@medusajs/ui"
import { ShoppingBag, X } from "lucide-react"
import Image from "next/image"
import { useState, useTransition } from "react"

import { dismissCartMergeNotice } from "@lib/data/cart"

export type MergedInItem = {
  title: string
  quantity: number
  thumbnail: string | null
}

/**
 * Shown once after signing in reunited the shopper with a cart from another
 * device. Signing in must never silently change what someone is about to pay
 * for, so this names exactly what appeared and leaves the next move to them.
 */
export default function CartMergeNotice({ items }: { items: MergedInItem[] }) {
  const [dismissed, setDismissed] = useState(false)
  const [, startTransition] = useTransition()

  if (!items.length || dismissed) {
    return null
  }

  const dismiss = () => {
    setDismissed(true)
    startTransition(() => {
      dismissCartMergeNotice()
    })
  }

  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 p-6 md:p-8"
      data-testid="cart-merge-notice"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShoppingBag className="mt-0.5 shrink-0 text-amber-700" size={20} />
          <div>
            <h2 className="font-medium text-ui-fg-base">
              {items.length === 1
                ? "We added 1 item you'd saved on another device"
                : `We added ${items.length} items you'd saved on another device`}
            </h2>
            <p className="mt-1 text-sm text-ui-fg-subtle">
              Your cart follows your account, so anything you added elsewhere is
              here too. Check it over before you check out.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-amber-800 transition-colors hover:bg-amber-100"
        >
          <X size={16} />
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {items.map((item, index) => (
          <li
            key={`${item.title}-${index}`}
            className="flex items-center gap-3 text-sm"
          >
            {item.thumbnail ? (
              <Image
                src={item.thumbnail}
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 rounded-lg bg-white object-cover"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-white" />
            )}
            <span className="text-ui-fg-base">{item.title}</span>
            <span className="text-ui-fg-muted">× {item.quantity}</span>
          </li>
        ))}
      </ul>

      <Button
        variant="secondary"
        className="mt-5 rounded-full"
        onClick={dismiss}
      >
        Got it
      </Button>
    </div>
  )
}
