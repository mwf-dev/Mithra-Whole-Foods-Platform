import { completeCartWorkflow } from "@medusajs/medusa/core-flows"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { unsellableItems } from "../../lib/catalog-visibility"

/**
 * Last line of defence for hidden products: no order can be placed for a
 * variant whose product is not published, however the cart got that item
 * (added before the product was hidden, a stale cached page, a crafted
 * request). Runs before anything is charged or reserved.
 */
completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  const items = (cart?.items ?? []) as { id: string; title?: string; variant_id?: string | null }[]
  const variantIds = [...new Set(items.map((i) => i?.variant_id).filter(Boolean))] as string[]
  if (!variantIds.length) return

  const query: any = (container as any).resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.status"],
    filters: { id: variantIds },
  })
  const status = new Map<string, string | null | undefined>(
    (data as any[]).map((v) => [v.id, v.product?.status])
  )

  const blocked = unsellableItems(items, status)
  if (blocked.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_ALLOWED,
      `No longer available: ${blocked.map((i) => i.title).join(", ")}. Please remove it from your cart.`
    )
  }
})
