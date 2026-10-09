import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateProductsWorkflow } from "@medusajs/medusa/core-flows"
import { loadProduct, toDetail } from "../../_shared"

/**
 * POST /admin/catalog-manager/:id/visibility  { visible: boolean, confirm: true }
 *
 * Publishing or hiding a product. `confirm: true` is mandatory so no client
 * (or stray request) can flip what shoppers see by accident — the UI asks the
 * operator first and sends it only after they agree.
 *
 * Hiding sets Medusa's product status to "draft". Medusa's store API, the
 * in-house search, the cart scrub, the checkout validation hook and the
 * reviews endpoints all key off that one status (see src/lib/catalog-visibility.ts),
 * so a hidden product is gone everywhere, not just from the listing.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const { visible, confirm } = (req.body ?? {}) as { visible?: unknown; confirm?: unknown }
  if (typeof visible !== "boolean") return res.status(400).json({ message: "visible must be true or false" })
  if (confirm !== true) return res.status(400).json({ message: "Confirmation required" })

  const product = await loadProduct(req.scope, req.params.id)
  if (!product) return res.status(404).json({ message: "Product not found" })

  const target = visible ? "published" : "draft"
  if (product.status !== target) {
    try {
      await updateProductsWorkflow(req.scope).run({
        input: { selector: { id: product.id }, update: { status: target } } as any,
      })
    } catch (e: any) {
      return res.status(502).json({ message: e?.message || "Could not change visibility." })
    }
  }

  const fresh = await loadProduct(req.scope, product.id)
  res.json({ product: toDetail(fresh) })
}
