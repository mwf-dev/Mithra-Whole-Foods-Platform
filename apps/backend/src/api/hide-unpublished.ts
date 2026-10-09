import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { productIdsInCategoryBody, stripUnsellableFromCategoryBody } from "../lib/catalog-visibility"

/**
 * `GET /store/product-categories` with `fields=*products` returns every
 * product in the category — drafts included. The storefront asks for exactly
 * that on every page, so a hidden product's id, name, handle and images ended
 * up in the page source and in a public API response.
 *
 * Wraps `res.json` so the body is filtered before it leaves the server. Only
 * published products are kept; if the lookup fails the response fails closed
 * (all nested products dropped) rather than leaking.
 */
export async function hideUnpublishedInCategories(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const original = res.json.bind(res)

  ;(res as any).json = (body: any) => {
    const ids = productIdsInCategoryBody(body)
    if (!ids.length) return original(body)

    const query: any = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    query
      .graph({ entity: "product", fields: ["id"], filters: { id: ids, status: "published" } })
      .then(({ data }: any) => original(stripUnsellableFromCategoryBody(body, new Set<string>(data.map((p: any) => p.id)))))
      .catch(() => original(stripUnsellableFromCategoryBody(body, new Set<string>())))
    return res
  }

  next()
}
