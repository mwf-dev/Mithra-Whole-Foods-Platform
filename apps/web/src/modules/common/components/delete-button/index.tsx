"use client"

import { useCartOptional } from "@lib/context/cart-context"
import { deleteLineItem } from "@lib/data/cart"
import { Spinner, Trash } from "@medusajs/icons"
import { clx } from "@medusajs/ui"
import { useState } from "react"

/**
 * Removes a line item optimistically — the row disappears and the nav badge
 * drops the instant it's clicked (via the cart context), while the Medusa
 * delete runs behind it and reconciles on response.
 */
const DeleteButton = ({
  id,
  children,
  className,
}: {
  id: string
  children?: React.ReactNode
  className?: string
}) => {
  const cartCtx = useCartOptional()
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    if (cartCtx) {
      await cartCtx.deleteItem(id)
    } else {
      await deleteLineItem(id).catch(() => {})
    }
    setIsDeleting(false)
  }

  return (
    <div
      className={clx(
        "flex items-center justify-between text-small-regular",
        className
      )}
    >
      <button
        className="flex gap-x-1 text-ui-fg-subtle hover:text-ui-fg-base cursor-pointer"
        onClick={() => handleDelete(id)}
      >
        {isDeleting ? <Spinner className="animate-spin" /> : <Trash />}
        <span>{children}</span>
      </button>
    </div>
  )
}

export default DeleteButton
