import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

export default async function addInrPrices({
  container,
}: {
  container: MedusaContainer
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const pricingModuleService = container.resolve(Modules.PRICING)

  logger.info("Fetching price sets...")

  const { data: priceSets } = await query.graph({
    entity: "price_set",
    fields: ["id", "prices.*"],
  })

  let addedCount = 0

  for (const priceSet of priceSets) {
    const hasInr = priceSet.prices?.some((p: any) => p.currency_code === "inr")
    if (!hasInr) {
      const usdPrice = priceSet.prices?.find((p: any) => p.currency_code === "usd")
      // default to 10 USD -> 800 INR if usd price not found
      let inrAmount = 800
      if (usdPrice && usdPrice.amount) {
        inrAmount = Math.round(usdPrice.amount * 80)
      }

      await pricingModuleService.createPrices([
        {
          price_set_id: priceSet.id,
          currency_code: "inr",
          amount: inrAmount,
        }
      ])
      addedCount++
    }
  }

  logger.info(`Finished adding INR prices for ${addedCount} price sets!`)
}
