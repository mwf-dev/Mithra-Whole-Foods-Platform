import { randomBytes } from "crypto"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PRODUCT_BRIEF_MODULE } from "../../../modules/product-brief"
import type ProductBriefService from "../../../modules/product-brief/service"
import {
  CLIENT_PRODUCT_PREFIX,
  countFilledSlides,
  deriveStatus,
  normalizeProposal,
  normalizeSlides,
  normalizeSummary,
} from "../../../lib/content-studio"
import { guard, noStore } from "../_shared"

/**
 * GET /content-studio/products?t=<token>
 *
 * The studio's index: every catalog product as a card, plus every product the
 * client has invented here (origin "client"), with the images each already has
 * and how far its brief has got. One query for products, one for briefs —
 * deliberately not per-product lookups, because the catalog is ~54 items and
 * the backend sits ~290ms from the database (see CLAUDE.md).
 *
 * Archived products are returned too, flagged rather than filtered: the client
 * needs a "Removed products" drawer they can restore from, and the operator
 * needs to see what they asked to drop. Nothing is ever deleted here.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  if (!guard(req, res)) return
  noStore(res)

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const briefService: ProductBriefService = req.scope.resolve(PRODUCT_BRIEF_MODULE)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "thumbnail", "status", "images.id", "images.url"],
    pagination: { take: 500, order: { title: "ASC" } },
  })

  const briefs = await briefService.listProductBriefs({})
  const byProduct = new Map<string, any>()
  for (const brief of briefs) byProduct.set(brief.product_id, brief)

  const card = (brief: any, base: {
    id: string
    title: string
    handle: string | null
    thumbnail: string | null
    image_count: number
    product_status: string | null
    origin: "catalog" | "client"
  }) => {
    const summary = normalizeSummary(brief?.summary)
    const slides = normalizeSlides(brief?.slides)
    const proposal = normalizeProposal(brief?.proposal)

    return {
      ...base,
      status: deriveStatus(brief, summary, slides, proposal),
      slide_count: slides.length,
      filled_slide_count: countFilledSlides(slides),
      archived: !!brief?.archived_at,
      archived_at: brief?.archived_at ?? null,
      archive_reason: brief?.archive_reason ?? null,
      updated_at: brief?.updated_at ?? null,
      updated_by: brief?.updated_by ?? null,
    }
  }

  const items = (products as any[]).map((product) =>
    card(byProduct.get(product.id), {
      id: product.id,
      title: product.title,
      handle: product.handle,
      thumbnail: product.thumbnail || product.images?.[0]?.url || null,
      image_count: product.images?.length ?? 0,
      product_status: product.status,
      origin: "catalog",
    })
  )

  for (const brief of briefs as any[]) {
    if (brief.origin !== "client") continue
    const proposal = normalizeProposal(brief.proposal)
    items.push(
      card(brief, {
        id: brief.product_id,
        title: proposal.title || brief.product_title || "New product",
        handle: null,
        thumbnail: proposal.images[0]?.url ?? null,
        image_count: proposal.images.length,
        product_status: null,
        origin: "client",
      })
    )
  }

  res.json({ products: items, count: items.length })
}

/**
 * POST /content-studio/products?t=  { title, ...proposal fields }
 *
 * The client adding a product we don't stock yet. This deliberately does NOT
 * create a Medusa product: the studio is link-authenticated, and letting a
 * link write into the live catalog is a different risk class entirely. It
 * creates a brief with a synthetic `new_…` product id, which the operator
 * reviews in admin → Content briefs and turns into a real product by hand.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  if (!guard(req, res)) return
  noStore(res)

  const body = (req.body ?? {}) as Record<string, unknown>
  const proposal = normalizeProposal(body)

  if (!proposal.title.trim()) {
    res.status(400).json({ message: "Please give the product a name." })
    return
  }

  const updatedBy = typeof body.updated_by === "string" ? body.updated_by.slice(0, 200) : ""
  const briefService: ProductBriefService = req.scope.resolve(PRODUCT_BRIEF_MODULE)

  const brief = await briefService.createProductBriefs({
    product_id: `${CLIENT_PRODUCT_PREFIX}${randomBytes(9).toString("hex")}`,
    origin: "client",
    product_title: proposal.title,
    product_handle: null,
    summary: normalizeSummary({}),
    slides: [],
    proposal,
    updated_by: updatedBy || null,
  } as any)

  const created = Array.isArray(brief) ? brief[0] : brief
  res.status(201).json({ product_id: created.product_id })
}
