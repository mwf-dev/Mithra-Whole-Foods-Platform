import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_BRIEF_MODULE } from "../../../../modules/product-brief"
import type ProductBriefService from "../../../../modules/product-brief/service"
import {
  countFilledSlides,
  deriveStatus,
  isClientProductId,
  normalizeProposal,
  normalizeSlides,
  normalizeSummary,
} from "../../../../lib/content-studio"
import { guard, noStore } from "../../_shared"

async function loadCatalogProduct(req: MedusaRequest, productId: string) {
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

/**
 * The editor works on one shape whether the product is real or proposed. For a
 * client-created product there is no catalog row, so the "product" is built
 * from the brief's own `proposal` — its uploaded photos stand in for the
 * catalog images the client would otherwise be looking at.
 */
function productFromProposal(productId: string, brief: any) {
  const proposal = normalizeProposal(brief?.proposal)
  return {
    id: productId,
    title: proposal.title || brief?.product_title || "New product",
    handle: null,
    subtitle: null,
    description: proposal.description || null,
    thumbnail: proposal.images[0]?.url ?? null,
    images: proposal.images.map((image) => ({ id: image.url, url: image.url })),
  }
}

function serialize(product: any, brief: any, origin: "catalog" | "client") {
  const summary = normalizeSummary(brief?.summary)
  const slides = normalizeSlides(brief?.slides)
  const proposal = normalizeProposal(brief?.proposal)
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
      origin,
      status: deriveStatus(brief, summary, slides, proposal),
      summary,
      slides,
      proposal,
      archived: !!brief?.archived_at,
      archive_reason: brief?.archive_reason ?? null,
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
  const briefService: ProductBriefService = req.scope.resolve(PRODUCT_BRIEF_MODULE)
  const [brief] = await briefService.listProductBriefs({ product_id: productId })

  if (isClientProductId(productId)) {
    if (!brief) {
      res.status(404).json({ message: "That product no longer exists." })
      return
    }
    res.json(serialize(productFromProposal(productId, brief), brief, "client"))
    return
  }

  const product = await loadCatalogProduct(req, productId)
  if (!product) {
    res.status(404).json({ message: "Product not found" })
    return
  }

  res.json(serialize(product, brief, "catalog"))
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
 * `archived_at` likewise belongs to /products/:id/archive alone — otherwise a
 * stale tab autosaving would resurrect a product the client just removed.
 */
export async function PUT(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  if (!guard(req, res)) return
  noStore(res)

  const productId = req.params.productId
  const briefService: ProductBriefService = req.scope.resolve(PRODUCT_BRIEF_MODULE)
  const [existing] = await briefService.listProductBriefs({ product_id: productId })
  const isClient = isClientProductId(productId)

  if (isClient && !existing) {
    res.status(404).json({ message: "That product no longer exists." })
    return
  }

  const product = isClient ? null : await loadCatalogProduct(req, productId)
  if (!isClient && !product) {
    res.status(404).json({ message: "Product not found" })
    return
  }

  const body = (req.body ?? {}) as Record<string, unknown>
  const summary = normalizeSummary(body.summary)
  const slides = normalizeSlides(body.slides)
  // A catalog product's identity is the catalog's, not the client's — only a
  // proposed product carries an editable proposal.
  const proposal = isClient ? normalizeProposal(body.proposal) : normalizeProposal(existing?.proposal)
  const updatedBy =
    typeof body.updated_by === "string" ? body.updated_by.slice(0, 200) : summary.contact

  const payload = {
    product_id: productId,
    origin: isClient ? "client" : "catalog",
    product_handle: isClient ? null : product.handle ?? null,
    product_title: isClient ? proposal.title || existing?.product_title || null : product.title ?? null,
    summary,
    slides,
    proposal: isClient ? proposal : existing?.proposal ?? null,
    updated_by: updatedBy || null,
  }

  // `as any`: the generated service types model.json() as Record<string, unknown>,
  // but `slides` is genuinely an array — see the model's comment for why.
  const brief = existing
    ? await briefService.updateProductBriefs({ id: existing.id, ...payload } as any)
    : await briefService.createProductBriefs(payload as any)

  const saved = Array.isArray(brief) ? brief[0] : brief
  res.json(
    serialize(
      isClient ? productFromProposal(productId, saved) : product,
      saved,
      isClient ? "client" : "catalog"
    )
  )
}
