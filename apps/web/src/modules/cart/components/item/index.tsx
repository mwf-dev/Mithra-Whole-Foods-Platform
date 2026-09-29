"use client"

import { Table, Text, clx } from "@medusajs/ui"
import { useCartOptional } from "@lib/context/cart-context"
import { updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import CartItemSelect from "@modules/cart/components/cart-item-select"
import ErrorMessage from "@modules/checkout/components/error-message"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Spinner from "@modules/common/icons/spinner"
import Thumbnail from "@modules/products/components/thumbnail"
import { useState } from "react"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  // Optional so this component also works in the checkout summary, which
  // renders outside the CartProvider. With a provider (cart page / dropdown)
  // the update is optimistic; without one we fall back to the plain action.
  const cartCtx = useCartOptional()
  const [updating, setUpdating] = useState(false)
  // Only the no-provider fallback surfaces inline; with a provider, mutation
  // errors are shown app-wide by the cart error toast (avoids a per-row dup).
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = async (quantity: number) => {
    // Optimistic: the quantity (and the derived nav badge) updates instantly
    // via the cart context; the server reconciles on response.
    setError(null)
    setUpdating(true)
    if (cartCtx) {
      await cartCtx.updateItem({ lineId: item.id, quantity })
    } else {
      await updateLineItem({ lineId: item.id, quantity }).catch((err) =>
        setError(err.message)
      )
    }
    setUpdating(false)
  }

  // Respect real inventory when it's managed (and backorders are off);
  // otherwise cap the dropdown at a sane maximum for a grocery order.
  const QUANTITY_CAP = 10
  const inventoryQty =
    item.variant?.manage_inventory && !item.variant?.allow_backorder
      ? item.variant?.inventory_quantity ?? QUANTITY_CAP
      : QUANTITY_CAP
  const maxQuantity = Math.max(1, Math.min(inventoryQty, QUANTITY_CAP))

  return (
    <div
      className="flex flex-col gap-4 border border-gray-200 rounded-xl p-4 bg-white shadow-sm mb-4"
      data-testid="product-row"
    >
      <div className="flex gap-4 items-start w-full">
        <LocalizedClientLink
          href={`/products/${item.product_handle}`}
          className="flex shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden border border-gray-100"
        >
          <Thumbnail
            thumbnail={item.thumbnail}
            images={item.variant?.product?.images}
            size="square"
          />
        </LocalizedClientLink>
        <div className="flex flex-col flex-1 gap-1">
          <Text
            className="txt-medium-plus text-ui-fg-base line-clamp-2"
            data-testid="product-title"
          >
            {item.product_title}
          </Text>
          <LineItemOptions variant={item.variant} data-testid="product-variant" />
          
          <div className="flex flex-col mt-2">
            <span className="font-semibold text-lg text-ui-fg-base">
              <LineItemUnitPrice
                item={item}
                style="tight"
                currencyCode={currencyCode}
              />
            </span>
            <span className="text-xs text-green-700 font-medium">In stock</span>
            <span className="text-xs text-ui-fg-subtle">Eligible for FREE shipping</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-1">
        {type === "full" && (
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-gray-200 rounded-full h-9 bg-white shadow-sm overflow-hidden">
              <button 
                type="button"
                className="w-9 h-full flex items-center justify-center text-ui-fg-subtle hover:bg-gray-50 disabled:opacity-50"
                onClick={() => changeQuantity(item.quantity - 1)}
                disabled={item.quantity <= 1 || updating}
              >
                <span className="text-lg leading-none mb-[2px]">-</span>
              </button>
              <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
              <button 
                type="button"
                className="w-9 h-full flex items-center justify-center text-ui-fg-subtle hover:bg-gray-50 disabled:opacity-50"
                onClick={() => changeQuantity(item.quantity + 1)}
                disabled={item.quantity >= maxQuantity || updating}
              >
                <span className="text-lg leading-none mb-[2px]">+</span>
              </button>
            </div>
            <DeleteButton id={item.id} data-testid="product-delete-button" />
            {updating && <Spinner />}
          </div>
        )}
        
        {type === "preview" && (
          <span className="flex items-center gap-2">
            <Text className="text-ui-fg-muted font-medium">Qty: {item.quantity}</Text>
          </span>
        )}

        {/* Display Total Price on the right side of the bottom row */}
        <div className="ml-auto font-semibold text-ui-fg-base">
          <LineItemPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </div>
      </div>

      {error && <ErrorMessage error={error} data-testid="product-error-message" />}
    </div>
  )
}

export default Item
