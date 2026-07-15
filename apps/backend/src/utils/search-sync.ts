import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

import {
  getMeiliClient,
  ensureProductIndex,
  SEARCH_INDEX,
  ProductSearchDoc,
} from "../lib/meilisearch"

const FIELDS = [
  "id",
  "title",
  "handle",
  "thumbnail",
  "description",
  "status",
  "categories.id",
  "categories.name",
  "tags.value",
  "created_at",
]

function toDoc(p: any): ProductSearchDoc {
  return {
    id: p.id,
    title: p.title ?? "",
    handle: p.handle ?? "",
    thumbnail: p.thumbnail ?? null,
    description: (p.description ?? "").slice(0, 1000),
    categories: (p.categories ?? []).map((c: any) => c?.name).filter(Boolean),
    category_ids: (p.categories ?? []).map((c: any) => c?.id).filter(Boolean),
    tags: (p.tags ?? []).map((t: any) => t?.value).filter(Boolean),
    created_at: p.created_at ? new Date(p.created_at).getTime() : 0,
  }
}

/** Full rebuild of the products index. Returns the number of docs indexed. */
export async function reindexAllProducts(
  container: MedusaContainer
): Promise<number> {
  const meili = getMeiliClient()
  if (!meili) {
    return 0
  }

  await ensureProductIndex(meili)

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: products } = await query.graph({
    entity: "product",
    fields: FIELDS,
  })

  const docs = (products ?? [])
    .filter((p: any) => p.status === "published")
    .map(toDoc)

  const index = meili.index<ProductSearchDoc>(SEARCH_INDEX)
  await index.deleteAllDocuments()
  if (docs.length) {
    await index.addDocuments(docs)
  }

  return docs.length
}

/** Upsert one product (or drop it if it's no longer published). */
export async function indexProduct(
  container: MedusaContainer,
  id: string
): Promise<void> {
  const meili = getMeiliClient()
  if (!meili) {
    return
  }

  await ensureProductIndex(meili)

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: FIELDS,
    filters: { id },
  })

  const p = data?.[0]
  const index = meili.index<ProductSearchDoc>(SEARCH_INDEX)

  if (!p || p.status !== "published") {
    await index.deleteDocument(id).catch(() => {})
    return
  }

  await index.addDocuments([toDoc(p)])
}

/** Remove one product from the index. */
export async function removeProduct(id: string): Promise<void> {
  const meili = getMeiliClient()
  if (!meili) {
    return
  }
  await meili.index(SEARCH_INDEX).deleteDocument(id).catch(() => {})
}
