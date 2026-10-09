import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  updateInventoryLevelsWorkflow,
  updateProductVariantsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"
import { ProductEditSchema, withUsdPrice } from "../../../../lib/catalog-edit"
import { loadProduct, primaryVariant, stockOf, toDetail } from "../_shared"

/** GET /admin/catalog-manager/:id — everything the editor needs. */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const product = await loadProduct(req.scope, req.params.id)
  if (!product) return res.status(404).json({ message: "Product not found" })
  res.json({ product: toDetail(product) })
}

/**
 * POST /admin/catalog-manager/:id — save edits (partial). Name, description,
 * photos (first = thumbnail), USD price and stock only; visibility has its own
 * route so it can demand an explicit confirmation. Everything goes through
 * Medusa's workflows so the storefront cache and search index refresh exactly
 * as they do for edits made in the stock admin.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const parsed = ProductEditSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues.map((i) => `${i.path.join(".") || "request"}: ${i.message}`).join("; "),
    })
  }
  const edit = parsed.data

  const product = await loadProduct(req.scope, req.params.id)
  if (!product) return res.status(404).json({ message: "Product not found" })
  const variant = primaryVariant(product)

  try {
    const update: Record<string, unknown> = {}
    if (edit.title !== undefined) update.title = edit.title
    if (edit.description !== undefined) update.description = edit.description
    if (edit.images !== undefined) {
      update.images = edit.images.map((url) => ({ url }))
      update.thumbnail = edit.images[0] ?? null
    }
    if (Object.keys(update).length) {
      await updateProductsWorkflow(req.scope).run({
        input: { selector: { id: product.id }, update } as any,
      })
    }

    if (edit.price !== undefined) {
      if (!variant) return res.status(409).json({ message: "This product has no variant to price." })
      const prices = withUsdPrice(variant.prices ?? [], edit.price)
      await updateProductVariantsWorkflow(req.scope).run({
        input: { product_variants: [{ id: variant.id, prices }] } as any,
      })
    }

    if (edit.stock !== undefined) {
      const stock = stockOf(product)
      if (!variant?.manage_inventory) {
        return res.status(409).json({ message: "Stock isn't tracked for this product." })
      }
      if (stock.inventoryItemId && stock.locationId) {
        await updateInventoryLevelsWorkflow(req.scope).run({
          input: {
            updates: [{ inventory_item_id: stock.inventoryItemId, location_id: stock.locationId, stocked_quantity: edit.stock }],
          } as any,
        })
      } else if (stock.inventoryItemId) {
        const [location] = await req.scope.resolve(Modules.STOCK_LOCATION).listStockLocations({}, { take: 1 })
        if (!location) return res.status(409).json({ message: "No stock location is set up." })
        await createInventoryLevelsWorkflow(req.scope).run({
          input: { inventory_levels: [{ inventory_item_id: stock.inventoryItemId, location_id: location.id, stocked_quantity: edit.stock }] } as any,
        })
      } else {
        return res.status(409).json({ message: "This product has no inventory record." })
      }
    }
  } catch (e: any) {
    return res.status(502).json({ message: e?.message || "Could not save the product." })
  }

  const fresh = await loadProduct(req.scope, product.id)
  res.json({ product: toDetail(fresh) })
}
