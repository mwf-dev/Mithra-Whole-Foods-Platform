import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * In-process product search — no external search service.
 *
 * For a catalog of this size (tens to a few thousand products) we can hold a
 * lightweight index in memory and score every product per query. This gives
 * typo tolerance (edit distance), field weighting, and curated-synonym
 * "semantics" (e.g. "healthy breakfast" → millet / health mix) with zero infra
 * to run, host, or keep in sync.
 */

// ---- tuning -------------------------------------------------------------

const FIELD_WEIGHTS = {
  title: 10,
  categories: 4,
  tags: 3,
  description: 1,
} as const

// Small stopword set so multi-word queries ("oil for cooking") don't get
// dragged around by filler words.
const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "of", "for", "with", "to", "in", "on",
  "is", "are", "my", "our",
])

/**
 * Curated synonym / concept groups — this is the "semantic" layer. Any term in
 * a group expands to the whole group at query time, so a shopper's word finds
 * products described with a different word. Extend freely as the catalog grows.
 */
// Kept deliberately tight: overly generic terms (e.g. "natural", "mix",
// "powder") appear across most products and would make every query match
// everything, so they're excluded from the concept groups.
const SYNONYM_GROUPS: string[][] = [
  ["ghee", "clarified", "butter"],
  ["oil", "oils"],
  ["sweet", "sweets", "dessert", "jaggery", "karupatti", "candy", "halwa", "laddu", "mysore", "jangiri"],
  ["healthy", "health", "nutritious", "wellness"],
  ["rice", "arisi"],
  ["flour", "flours", "maavu", "atta"],
  ["dal", "dals", "lentil", "lentils", "paruppu", "moong", "toor"],
  ["drink", "drinks", "beverage", "juice", "malt"],
  ["snack", "snacks", "savory", "savoury"],
  ["millet", "millets", "kambu", "thinai", "sorghum", "ragi"],
  ["spice", "spices", "masala", "podi"],
  ["salt", "uppu"],
  ["pickle", "pickles", "oorugai"],
  ["breakfast", "morning", "porridge", "kanji", "kali"],
]

// term -> set of expansion terms (built once from the groups above)
const SYNONYM_INDEX: Map<string, Set<string>> = (() => {
  const idx = new Map<string, Set<string>>()
  for (const group of SYNONYM_GROUPS) {
    for (const term of group) {
      const set = idx.get(term) ?? new Set<string>()
      for (const other of group) {
        set.add(other)
      }
      idx.set(term, set)
    }
  }
  return idx
})()

// ---- text utils ---------------------------------------------------------

function tokenize(input: string): string[] {
  return (input || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((t) => t.length > 0)
}

/** Levenshtein edit distance with early exit once it exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (a === b) return 0
  if (Math.abs(a.length - b.length) > max) return max + 1

  const prev = new Array(b.length + 1)
  const curr = new Array(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j

  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    let rowMin = curr[0]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
      if (curr[j] < rowMin) rowMin = curr[j]
    }
    if (rowMin > max) return max + 1
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]
  }
  return prev[b.length]
}

/** How many typos we tolerate for a term of a given length. */
function typoBudget(len: number): number {
  if (len <= 2) return 0
  if (len <= 5) return 1
  return 2
}

function expand(term: string): string[] {
  const set = SYNONYM_INDEX.get(term)
  return set ? Array.from(set) : [term]
}

// ---- index --------------------------------------------------------------

type IndexedField = { weight: number; tokens: string[] }
type IndexedProduct = { id: string; title: string; fields: IndexedField[] }

type SearchIndex = { products: IndexedProduct[]; builtAt: number }

const FIELDS = [
  "id",
  "title",
  "description",
  "status",
  "categories.name",
  "tags.value",
]

const TTL_MS = 60_000
let cache: SearchIndex | null = null

/** Called by the catalog-changed subscriber so edits show up immediately. */
export function invalidateSearchIndex(): void {
  cache = null
}

async function buildIndex(container: MedusaContainer): Promise<SearchIndex> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: FIELDS,
  })

  const indexed: IndexedProduct[] = (products ?? [])
    .filter((p: any) => p.status === "published")
    .map((p: any) => {
      const title = p.title ?? ""
      const categories = (p.categories ?? [])
        .map((c: any) => c?.name)
        .filter(Boolean)
        .join(" ")
      const tags = (p.tags ?? [])
        .map((t: any) => t?.value)
        .filter(Boolean)
        .join(" ")
      const description = p.description ?? ""

      return {
        id: p.id,
        title,
        fields: [
          { weight: FIELD_WEIGHTS.title, tokens: tokenize(title) },
          { weight: FIELD_WEIGHTS.categories, tokens: tokenize(categories) },
          { weight: FIELD_WEIGHTS.tags, tokens: tokenize(tags) },
          { weight: FIELD_WEIGHTS.description, tokens: tokenize(description) },
        ],
      }
    })

  return { products: indexed, builtAt: Date.now() }
}

async function getIndex(container: MedusaContainer): Promise<SearchIndex> {
  if (!cache || Date.now() - cache.builtAt > TTL_MS) {
    cache = await buildIndex(container)
  }
  return cache
}

// ---- scoring ------------------------------------------------------------

/** Best score a single query term earns against one product field. */
function scoreTermInField(variants: string[], field: IndexedField): number {
  let best = 0
  for (const token of field.tokens) {
    for (let v = 0; v < variants.length; v++) {
      const variant = variants[v]
      // synonyms score a little lower than the shopper's actual word
      const synFactor = v === 0 ? 1 : 0.7
      let factor = 0

      if (token === variant) {
        factor = 1
      } else if (variant.length >= 3 && token.startsWith(variant)) {
        factor = 0.8
      } else if (variant.length >= 3) {
        const budget = typoBudget(variant.length)
        if (budget > 0 && editDistance(token, variant, budget) <= budget) {
          factor = 0.5
        }
      }

      const cand = field.weight * factor * synFactor
      if (cand > best) best = cand
    }
  }
  return best
}

export type SearchResult = { ids: string[]; count: number }

export async function searchProducts(
  container: MedusaContainer,
  {
    q,
    limit = 12,
    offset = 0,
  }: { q: string; limit?: number; offset?: number }
): Promise<SearchResult> {
  const rawTerms = tokenize(q).filter((t) => !STOPWORDS.has(t))
  if (rawTerms.length === 0) {
    return { ids: [], count: 0 }
  }

  const queryTerms = rawTerms.map((t) => expand(t))
  const index = await getIndex(container)
  const normalizedQuery = rawTerms.join(" ")

  const scored: { id: string; score: number; title: string }[] = []

  for (const product of index.products) {
    let total = 0
    let matched = 0

    for (const variants of queryTerms) {
      let bestForTerm = 0
      for (const field of product.fields) {
        const s = scoreTermInField(variants, field)
        if (s > bestForTerm) bestForTerm = s
      }
      if (bestForTerm > 0) {
        matched++
        total += bestForTerm
      }
    }

    if (matched === 0) continue

    // Require most terms to match on multi-word queries, so "cold pressed oil"
    // doesn't surface anything that merely contains "oil".
    if (queryTerms.length > 1 && matched < Math.ceil(queryTerms.length / 2)) {
      continue
    }

    // Bonuses: full-coverage and a literal title match.
    if (matched === queryTerms.length) total *= 1.25
    if (product.title.toLowerCase().includes(normalizedQuery)) total *= 1.5

    scored.push({ id: product.id, score: total, title: product.title })
  }

  scored.sort((a, b) =>
    b.score !== a.score ? b.score - a.score : a.title.localeCompare(b.title)
  )

  return {
    count: scored.length,
    ids: scored.slice(offset, offset + limit).map((s) => s.id),
  }
}
