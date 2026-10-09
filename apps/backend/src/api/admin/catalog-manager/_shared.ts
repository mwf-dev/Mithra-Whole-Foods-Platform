import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import { issuesFor } from "../../../lib/catalog-edit"

export const PRODUCT_FIELDS = [
  "id",
  "title",
  "handle",
  "status",
  "description",
  "thumbnail",
  "updated_at",
  "images.id",
  "images.url",
  "images.rank",
  "categories.name",
  "variants.id",
  "variants.manage_inventory",
  "variants.prices.id",
  "variants.prices.amount",
  "variants.prices.currency_code",
  "variants.inventory_items.inventory_item_id",
  "variants.inventory_items.inventory.location_levels.id",
  "variants.inventory_items.inventory.location_levels.location_id",
  "variants.inventory_items.inventory.location_levels.stocked_quantity",
  "variants.inventory_items.inventory.location_levels.reserved_quantity",
]

const sortedImages = (p: any) =>
  [...(p.images ?? [])].sort((a: any, b: any) => (a.rank ?? 0) - (b.rank ?? 0))

/** The single variant every product in this catalog has (the editor assumes one). */
export const primaryVariant = (p: any) => p.variants?.[0] ?? null

export function stockOf(p: any): { quantity: number | null; reserved: number; locationId: string | null; inventoryItemId: string | null } {
  const v = primaryVariant(p)
  const link = v?.inventory_items?.[0]
  const levels = link?.inventory?.location_levels ?? []
  if (!v?.manage_inventory || !levels.length) {
    return { quantity: v?.manage_inventory ? 0 : null, reserved: 0, locationId: levels[0]?.location_id ?? null, inventoryItemId: link?.inventory_item_id ?? null }
  }
  return {
    quantity: levels.reduce((n: number, l: any) => n + Number(l.stocked_quantity ?? 0), 0),
    reserved: levels.reduce((n: number, l: any) => n + Number(l.reserved_quantity ?? 0), 0),
    locationId: levels[0].location_id,
    inventoryItemId: link.inventory_item_id,
  }
}

export const usdPrice = (p: any): number | null => {
  const row = (primaryVariant(p)?.prices ?? []).find((x: any) => x.currency_code === "usd")
  const n = Number(row?.amount)
  return n > 0 ? n : null
}

export function toCard(p: any) {
  const imgs = sortedImages(p)
  const stock = stockOf(p)
  const price = usdPrice(p)
  return {
    id: p.id,
    title: p.title,
    handle: p.handle,
    visible: p.status === "published",
    thumbnail: p.thumbnail ?? imgs[0]?.url ?? null,
    price,
    stock: stock.quantity,
    category: (p.categories ?? []).map((c: any) => c.name).join(", ") || null,
    issues: issuesFor({
      price,
      images: imgs.length,
      description: p.description,
      stock: stock.quantity,
      manageInventory: !!primaryVariant(p)?.manage_inventory,
    }),
  }
}

export function toDetail(p: any) {
  const v = primaryVariant(p)
  const stock = stockOf(p)
  return {
    ...toCard(p),
    description: p.description ?? "",
    images: sortedImages(p).map((i: any) => ({ id: i.id, url: i.url })),
    variant_id: v?.id ?? null,
    manage_inventory: !!v?.manage_inventory,
    reserved: stock.reserved,
    multi_variant: (p.variants?.length ?? 0) > 1,
    updated_at: p.updated_at,
  }
}

export async function loadProducts(container: MedusaContainer, filters: Record<string, unknown> = {}) {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "product",
    fields: PRODUCT_FIELDS,
    filters: filters as any,
    pagination: { take: 500, order: { title: "ASC" } },
  })
  return data as any[]
}

export async function loadProduct(container: MedusaContainer, id: string) {
  return (await loadProducts(container, { id }))[0] ?? null
}
