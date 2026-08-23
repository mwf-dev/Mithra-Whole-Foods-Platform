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
  product_title?: string | null
  product_handle?: string | null
  status?: string | null
  updated_by?: string | null
  summary?: unknown
  slides?: unknown
}): string {
  const summary = normalizeSummary(brief.summary)
  const slides = normalizeSlides(brief.slides)

  const lines: string[] = []
  lines.push(`# Content brief — ${brief.product_title || brief.product_handle || "product"}`)
  lines.push(`# status: ${brief.status || "draft"}${brief.updated_by ? ` · filled in by: ${brief.updated_by}` : ""}`)
  lines.push(`product_name: ${yamlString(brief.product_title || "")}`)
  lines.push(`handle:       ${yamlString(brief.product_handle || "")}`)
  lines.push(`tagline:      ${yamlString(summary.tagline)}`)
  lines.push(`sub_claim:    ${yamlString(summary.sub_claim)}`)

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
