import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

/**
 * Read-only. Reports everything that decides whether the two price-less seed
 * products ("Wood Pressed Groundnut Oil", "Organic Turmeric Powder") can be
 * removed, and what would break if they were: status, sales channels,
 * collection membership, variant/price rows, inventory links, and — the usual
 * reason a delete is refused — whether any order line item still points at them.
 *
 * Run: cd apps/backend && npx medusa exec ./src/scripts/inspect-unpriced-products.ts
 */
export default async function inspectUnpricedProducts({ container }: ExecArgs) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  const HANDLES = ["wood-pressed-groundnut-oil", "organic-turmeric-powder"]

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "status",
      "thumbnail",
      "collection_id",
      "collection.title",
      "categories.name",
      "sales_channels.id",
      "sales_channels.name",
      "variants.id",
      "variants.title",
      "variants.sku",
      "variants.manage_inventory",
    ],
    filters: { handle: HANDLES },
  })

  if (!products.length) {
    logger.info("No products matched those handles — nothing to do.")
    return
  }

  const variantIds = products.flatMap((p: any) =>
    (p.variants ?? []).map((v: any) => v.id)
  )

  // The decisive question: is either product referenced by an existing order?
  // Medusa keeps order line items pointing at the variant, so a hard delete of
  // a purchased product is what corrupts order history.
  const orderModule = container.resolve(Modules.ORDER)
  const [orderItems] = await orderModule.listAndCountOrderLineItems(
    { variant_id: variantIds },
    { select: ["id", "title", "variant_id", "order_id"], take: 20 }
  )

  // Price rows are what "unpriced" actually means — confirm they are absent
  // rather than merely absent from the storefront's region context.
  const pricingModule = container.resolve(Modules.PRICING)
  const { data: priceSets } = await query.graph({
    entity: "product_variant_price_set",
    fields: ["variant_id", "price_set_id"],
    filters: { variant_id: variantIds },
  })

  let priceCount = 0
  if (priceSets.length) {
    const prices = await pricingModule.listPrices({
      price_set_id: priceSets.map((p: any) => p.price_set_id),
    })
    priceCount = prices.length
    for (const p of prices) {
      logger.info(`   price row: ${p.amount} ${p.currency_code}`)
    }
  }

  logger.info("=".repeat(72))
  for (const p of products as any[]) {
    logger.info(`\n${p.title}`)
    logger.info(`  id           : ${p.id}`)
    logger.info(`  handle       : ${p.handle}`)
    logger.info(`  status       : ${p.status}`)
    logger.info(`  thumbnail    : ${p.thumbnail ?? "(none)"}`)
    logger.info(
      `  collection   : ${p.collection?.title ?? "(none)"} [${p.collection_id ?? "-"}]`
    )
    logger.info(
      `  categories   : ${(p.categories ?? []).map((c: any) => c.name).join(", ") || "(none)"}`
    )
    logger.info(
      `  sales chans  : ${(p.sales_channels ?? []).map((s: any) => s.name).join(", ") || "(none)"}`
    )
    for (const v of p.variants ?? []) {
      logger.info(`  variant      : ${v.id} "${v.title}" sku=${v.sku ?? "-"}`)
    }
  }

  logger.info("\n" + "=".repeat(72))
  logger.info(`price rows across both products : ${priceCount}`)
  logger.info(`order line items referencing them: ${orderItems.length}`)
  for (const li of orderItems as any[]) {
    logger.info(`   order ${li.order_id} — "${li.title}"`)
  }
  logger.info(
    orderItems.length
      ? "\n=> DO NOT hard-delete. Set status to 'draft' instead; deleting would " +
          "orphan real order history."
      : "\n=> No order references. Safe to delete, but 'draft' is still the " +
          "reversible way to take them off the storefront."
  )
}
