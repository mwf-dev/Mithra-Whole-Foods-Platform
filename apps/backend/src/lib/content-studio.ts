import { createHash, timingSafeEqual } from "crypto"

/**
 * Shared logic for the Content Studio — the unauthenticated, link-only intake
 * where the client supplies per-product copy, slide plans and reference images.
 * See src/api/content-studio/route.ts for the threat model.
 */

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB per file
export const MAX_SLIDES = 24
export const MAX_IMAGES_PER_SLIDE = 12
export const MAX_LINKS_PER_SLIDE = 8
export const MAX_TEXT = 4000

const MIN_TOKEN_LENGTH = 16

export const ALLOWED_UPLOAD_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "image/heic",
  "image/heif",
  "application/pdf",
])

export type TokenCheck =
  | { ok: true }
  | { ok: false; status: 503 | 401; message: string }

/**
 * The studio's only access control is possession of the link, so the token has
 * to behave like a password: compared in constant time, and refused outright
 * if it is short enough to brute-force through the rate limiter.
 *
 * Unset env → 503, not 401. A missing token is a deployment state ("this
 * feature isn't switched on"), and reporting it as an auth failure would send
 * whoever set it up hunting for a wrong password instead of a missing var.
 */
export function checkStudioToken(supplied: unknown): TokenCheck {
  const expected = process.env.CONTENT_STUDIO_TOKEN

  if (!expected || expected.length < MIN_TOKEN_LENGTH) {
    return {
      ok: false,
      status: 503,
      message:
        "Content Studio is not enabled. Set CONTENT_STUDIO_TOKEN " +
        `(at least ${MIN_TOKEN_LENGTH} characters) on the backend and restart.`,
    }
  }

  const got = typeof supplied === "string" ? supplied : ""
  // Hash both sides first: timingSafeEqual throws on a length mismatch, and
  // the throw itself would leak the expected length.
  const a = createHash("sha256").update(got).digest()
  const b = createHash("sha256").update(expected).digest()

  if (!timingSafeEqual(a, b)) {
    return { ok: false, status: 401, message: "Invalid or missing access link." }
  }

  return { ok: true }
}

/**
 * Products the client invents in the studio have no Medusa product behind
 * them, so they get a synthetic id under this prefix. Everything downstream
 * (the editor, the admin queue, the YAML) keys off it to know that
 * `proposal` — not the catalog — is the source of truth for the product.
 */
export const CLIENT_PRODUCT_PREFIX = "new_"

export function isClientProductId(productId: unknown): boolean {
  return typeof productId === "string" && productId.startsWith(CLIENT_PRODUCT_PREFIX)
}

export type BriefSlideImage = { url: string; key: string; filename: string }

export type BriefSlide = {
  id: string
  name: string
  content: string
  notes: string
  links: string[]
  images: BriefSlideImage[]
}

export type BriefSummary = {
  tagline: string
  sub_claim: string
  notes: string
  links: string[]
  contact: string
}

function str(value: unknown, max = MAX_TEXT): string {
  if (typeof value !== "string") return ""
  return value.slice(0, max)
}

/**
 * Only http(s) URLs survive. The studio's output is pasted into an admin page
 * and rendered as anchors, so a `javascript:` or `data:` reference link would
 * be stored XSS aimed at whoever reviews the brief.
 */
export function sanitizeLink(value: unknown): string | null {
  const raw = str(value, 2000).trim()
  if (!raw) return null
  let candidate = raw
  if (!/^https?:\/\//i.test(candidate)) {
    // Clients paste bare domains constantly; assume https rather than drop it.
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(candidate)) candidate = `https://${candidate}`
    else return null
  }
  try {
    const url = new URL(candidate)
    if (url.protocol !== "http:" && url.protocol !== "https:") return null
    return url.toString()
  } catch {
    return null
  }
}

function sanitizeLinks(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    const link = sanitizeLink(item)
    if (link && !out.includes(link)) out.push(link)
    if (out.length >= max) break
  }
  return out
}

/**
 * Uploaded assets are only ever trusted when they came back from our own
 * upload route, so re-validate the URL on save: a client could otherwise PUT
 * an arbitrary `images[].url` and have the admin page render a remote image.
 */
function sanitizeImages(value: unknown): BriefSlideImage[] {
  if (!Array.isArray(value)) return []
  const out: BriefSlideImage[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const url = sanitizeLink((item as any).url)
    if (!url) continue
    out.push({
      url,
      key: str((item as any).key, 500),
      filename: str((item as any).filename, 300),
    })
    if (out.length >= MAX_IMAGES_PER_SLIDE) break
  }
  return out
}

export type BriefProposal = {
  title: string
  category: string
  pack_size: string
  price: string
  description: string
  ingredients: string
  notes: string
  images: BriefSlideImage[]
}

/**
 * The client's description of a product that does not exist yet. Free text
 * throughout — including `price`, which is a note to the operator ("$12.99 for
 * the 500g"), never a parsed money value. Nothing here creates or edits a
 * catalog product; a human does that from the admin review page.
 */
export function normalizeProposal(value: unknown): BriefProposal {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  return {
    title: str(raw.title, 200),
    category: str(raw.category, 200),
    pack_size: str(raw.pack_size, 120),
    price: str(raw.price, 120),
    description: str(raw.description),
    ingredients: str(raw.ingredients),
    notes: str(raw.notes),
    images: sanitizeImages(raw.images),
  }
}

/** Does a proposal carry anything beyond an empty form? */
export function hasProposalContent(proposal: BriefProposal): boolean {
  return !!(
    proposal.title ||
    proposal.category ||
    proposal.pack_size ||
    proposal.price ||
    proposal.description ||
    proposal.ingredients ||
    proposal.notes ||
    proposal.images.length
  )
}

let slideCounter = 0

export function normalizeSlides(value: unknown): BriefSlide[] {
  if (!Array.isArray(value)) return []
  const slides: BriefSlide[] = []
  const seenIds = new Set<string>()

  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const raw = item as Record<string, unknown>

    let id = str(raw.id, 60).replace(/[^A-Za-z0-9_-]/g, "")
    if (!id || seenIds.has(id)) id = `s${Date.now().toString(36)}${slideCounter++}`
    seenIds.add(id)

    slides.push({
      id,
      name: str(raw.name, 120),
      content: str(raw.content),
      notes: str(raw.notes),
      links: sanitizeLinks(raw.links, MAX_LINKS_PER_SLIDE),
      images: sanitizeImages(raw.images),
    })

    if (slides.length >= MAX_SLIDES) break
  }

  return slides
}

export function normalizeSummary(value: unknown): BriefSummary {
  const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>
  return {
    tagline: str(raw.tagline, 200),
    sub_claim: str(raw.sub_claim, 200),
    notes: str(raw.notes),
    links: sanitizeLinks(raw.links, MAX_LINKS_PER_SLIDE),
    contact: str(raw.contact, 200),
  }
}

/** A brief with no words and no images anywhere is "not started" to the UI. */
export function isEmptyBrief(summary: BriefSummary, slides: BriefSlide[]): boolean {
  const summaryFilled =
    !!summary.tagline || !!summary.sub_claim || !!summary.notes || summary.links.length > 0
  if (summaryFilled) return false
  return !slides.some(
    (s) => s.name || s.content || s.notes || s.links.length > 0 || s.images.length > 0
  )
}

/**
 * The status the UI shows. "not_started" is derived, never stored: a brief row
 * exists as soon as the client so much as archives a product, and a card with
 * a stored "draft" but no words in it would read as work in progress. Every
 * surface (studio grid, editor, admin queue) must derive it the same way or a
 * product looks untouched in one place and half-filled in another.
 */
export function deriveStatus(
  brief: { status?: string | null } | null | undefined,
  summary: BriefSummary,
  slides: BriefSlide[],
  proposal: BriefProposal
): string {
  if (!brief) return "not_started"
  if (isEmptyBrief(summary, slides) && !hasProposalContent(proposal)) return "not_started"
  return brief.status || "draft"
}

/** Slides that carry at least one piece of real content — the progress number. */
export function countFilledSlides(slides: BriefSlide[]): number {
  return slides.filter(
    (s) => s.content.trim() || s.images.length > 0 || s.links.length > 0 || s.notes.trim()
  ).length
}

function yamlString(value: string): string {
  if (!value) return '""'
  if (value.includes("\n")) {
    const indented = value
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n")
    return `|-\n${indented}`
  }
  return JSON.stringify(value)
}

/**
 * Render a stored brief as the YAML the PIDS operator prompt expects
 * (docs/PIDS_OPERATOR_PROMPT.md). This is the whole point of the studio: the
 * client fills a form, we paste the result straight into the image pipeline
 * without retyping a word of their copy.
 */
export function briefToYaml(brief: {
  product_id?: string | null
  product_title?: string | null
  product_handle?: string | null
  status?: string | null
  updated_by?: string | null
  origin?: string | null
  archived_at?: Date | string | null
  archive_reason?: string | null
  summary?: unknown
  slides?: unknown
  proposal?: unknown
}): string {
  const summary = normalizeSummary(brief.summary)
  const slides = normalizeSlides(brief.slides)
  const proposal = normalizeProposal(brief.proposal)
  const isNewProduct = brief.origin === "client" || isClientProductId(brief.product_id)

  const lines: string[] = []
  lines.push(
    `# Content brief — ${brief.product_title || proposal.title || brief.product_handle || "product"}`
  )
  lines.push(`# status: ${brief.status || "draft"}${brief.updated_by ? ` · filled in by: ${brief.updated_by}` : ""}`)
  if (isNewProduct) {
    lines.push("# NEW PRODUCT — proposed by the client, not in the catalog yet.")
  }
  if (brief.archived_at) {
    lines.push(
      `# REMOVAL REQUESTED by the client${brief.archive_reason ? ` — ${brief.archive_reason.replace(/\s+/g, " ")}` : ""}`
    )
  }
  lines.push(`product_name: ${yamlString(brief.product_title || "")}`)
  lines.push(`handle:       ${yamlString(brief.product_handle || "")}`)
  lines.push(`tagline:      ${yamlString(summary.tagline)}`)
  lines.push(`sub_claim:    ${yamlString(summary.sub_claim)}`)

  if (isNewProduct && hasProposalContent(proposal)) {
    lines.push("new_product:")
    lines.push(`  title:       ${yamlString(proposal.title)}`)
    if (proposal.category) lines.push(`  category:    ${yamlString(proposal.category)}`)
    if (proposal.pack_size) lines.push(`  pack_size:   ${yamlString(proposal.pack_size)}`)
    if (proposal.price) lines.push(`  price:       ${yamlString(proposal.price)}`)
    if (proposal.description) lines.push(`  description: ${yamlString(proposal.description)}`)
    if (proposal.ingredients) lines.push(`  ingredients: ${yamlString(proposal.ingredients)}`)
    if (proposal.notes) lines.push(`  notes:       ${yamlString(proposal.notes)}`)
    if (proposal.images.length) {
      lines.push("  images:")
      for (const image of proposal.images) lines.push(`    - ${yamlString(image.url)}`)
    }
  }

  if (summary.notes) lines.push(`notes:        ${yamlString(summary.notes)}`)
  if (summary.links.length) {
    lines.push("references:")
    for (const link of summary.links) lines.push(`  - ${yamlString(link)}`)
  }

  lines.push("slides:")
  if (!slides.length) {
    lines.push("  []")
  }
  slides.forEach((slide, index) => {
    lines.push(`  - number: ${index + 1}`)
    lines.push(`    name:    ${yamlString(slide.name)}`)
    if (slide.content) lines.push(`    content: ${yamlString(slide.content)}`)
    if (slide.notes) lines.push(`    notes:   ${yamlString(slide.notes)}`)
    if (slide.links.length) {
      lines.push("    references:")
      for (const link of slide.links) lines.push(`      - ${yamlString(link)}`)
    }
    if (slide.images.length) {
      lines.push("    images:")
      for (const image of slide.images) lines.push(`      - ${yamlString(image.url)}`)
    }
  })

  return lines.join("\n") + "\n"
}
