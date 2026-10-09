import { z } from "zod"

/**
 * Rules for the product editor, kept free of Medusa imports so they're
 * unit-testable. The editor only changes what the storefront actually shows:
 * name, description, photos, price (USD) and stock.
 */
export const MAX_IMAGES = 12

const httpsUrl = z
  .string()
  .trim()
  .url()
  .refine((u) => u.startsWith("https://"), "Image links must be https")

export const ProductEditSchema = z
  .object({
    title: z.string().trim().min(1, "Name is required").max(150).optional(),
    description: z.string().trim().max(5000).optional(),
    // Order matters: the first photo is the thumbnail shown on product cards.
    images: z.array(httpsUrl).max(MAX_IMAGES).optional(),
    // Dollars, e.g. 3.99. 0 / null clears the price (shows "Coming soon").
    price: z.number().min(0).max(100000).nullable().optional(),
    stock: z.number().int().min(0).max(1000000).optional(),
  })
  .strict()

export type ProductEdit = z.infer<typeof ProductEditSchema>

export type PriceRow = { id?: string; amount: number; currency_code: string }

/**
 * Sets the USD price while leaving every other currency/price row exactly as it
 * is (the catalog also carries INR prices). Existing USD rows keep their id so
 * the pricing module updates them in place instead of duplicating.
 * `null`/0 removes the USD price.
 */
export function withUsdPrice(existing: PriceRow[], usd: number | null): PriceRow[] {
  const others = existing.filter((p) => p.currency_code !== "usd")
  if (!usd || usd <= 0) return others
  const current = existing.find((p) => p.currency_code === "usd")
  return [
    ...others,
    { ...(current?.id ? { id: current.id } : {}), amount: Math.round(usd * 100) / 100, currency_code: "usd" },
  ]
}

export type Issue = "no_price" | "no_photo" | "no_description" | "out_of_stock"

/** What a shopper would notice is missing — shown as chips on the cards. */
export function issuesFor(p: {
  price: number | null
  images: number
  description?: string | null
  stock: number | null
  manageInventory: boolean
}): Issue[] {
  const out: Issue[] = []
  if (!p.price) out.push("no_price")
  if (!p.images) out.push("no_photo")
  if (!p.description?.trim()) out.push("no_description")
  if (p.manageInventory && (p.stock ?? 0) <= 0) out.push("out_of_stock")
  return out
}
