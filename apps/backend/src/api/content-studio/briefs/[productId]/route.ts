import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_BRIEF_MODULE } from "../../../../modules/product-brief"
import type ProductBriefService from "../../../../modules/product-brief/service"
import {
  countFilledSlides,
  isEmptyBrief,
  normalizeSlides,
  normalizeSummary,
} from "../../../../lib/content-studio"
import { guard, noStore } from "../../_shared"

async function loadProduct(req: MedusaRequest, productId: string) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "subtitle",
      "description",
      "thumbnail",
      "images.id",
      "images.url",
    ],
    filters: { id: productId } as any,
  })
  return (data as any[])[0]
}

function serialize(product: any, brief: any) {
  const summary = normalizeSummary(brief?.summary)
  const slides = normalizeSlides(brief?.slides)
  return {
    product: {
      id: product.id,
      title: product.title,
      handle: product.handle,
      subtitle: product.subtitle,
      description: product.description,
      thumbnail: product.thumbnail,
      images: (product.images ?? []).map((image: any) => ({ id: image.id, url: image.url })),
    },
    brief: {
      // "not_started" is a derived UI state, not a stored one — the card grid
      // computes it the same way, and the two must agree or a product looks
      // untouched in the list and half-started once opened.
      status: !brief || isEmptyBrief(summary, slides) ? "not_started" : brief.status,
      summary,
      slides,
      updated_at: brief?.updated_at ?? null,
      updated_by: brief?.updated_by ?? null,
      submitted_at: brief?.submitted_at ?? null,
      filled_slide_count: countFilledSlides(slides),
    },
  }
}

/** GET /content-studio/briefs/:productId?t= — the editor's initial state. */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  if (!guard(req, res)) return
  noStore(res)

  const productId = req.params.productId
  const product = await loadProduct(req, productId)
  if (!product) {
    res.status(404).json({ message: "Product not found" })
    return
  }

  const briefService: ProductBriefService = req.scope.resolve(PRODUCT_BRIEF_MODULE)
  const [brief] = await briefService.listProductBriefs({ product_id: productId })

  res.json(serialize(product, brief))
}

/**
 * PUT /content-studio/briefs/:productId?t= — autosave.
 *
 * Called on a debounce as the client types, so it must be an idempotent
 * whole-document upsert: the browser owns the state, the server stores what it
 * is handed after sanitising it. Nothing here merges — a partial body would
 * make a race between two tabs lose content silently rather than loudly.
 *
 * `status` is deliberately NOT accepted from this route; only /submit and the
 * admin move it, so an autosave can never quietly un-submit a finished brief.
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  if (!guard(req, res)) return
  noStore(res)

  const productId = req.params.productId
  const product = await loadProduct(req, productId)
  if (!product) {
    res.status(404).json({ message: "Product not found" })
    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const summary = normalizeSummary(body.summary)
  const slides = normalizeSlides(body.slides)
  const updatedBy =
    typeof body.updated_by === "string" ? body.updated_by.slice(0, 200) : summary.contact

  const briefService: ProductBriefService = req.scope.resolve(PRODUCT_BRIEF_MODULE)
  const [existing] = await briefService.listProductBriefs({ product_id: productId })

  const payload = {
    product_id: productId,
    product_handle: product.handle ?? null,
    product_title: product.title ?? null,
    summary,
    slides,
    updated_by: updatedBy || null,
  }

  // `as any`: the generated service types model.json() as Record<string, unknown>,
  // but `slides` is genuinely an array — see the model's comment for why.
  const brief = existing
    ? await briefService.updateProductBriefs({ id: existing.id, ...payload } as any)
    : await briefService.createProductBriefs(payload as any)

  res.json(serialize(product, Array.isArray(brief) ? brief[0] : brief))
}
