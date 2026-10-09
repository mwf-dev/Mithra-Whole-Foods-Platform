/**
 * Pure logic behind the "Ship orders" admin page. Kept free of Medusa imports
 * so the rules that decide what a packer sees (and what the buttons may do)
 * are unit-testable.
 */
export type Stage = "to_ship" | "label_ready" | "shipped" | "delivered"

export type RawFulfillment = {
  id: string
  packed_at?: string | null
  shipped_at?: string | null
  delivered_at?: string | null
  canceled_at?: string | null
  items?: { line_item_id?: string | null; quantity?: number | string | null }[]
  labels?: { tracking_number?: string | null; tracking_url?: string | null; label_url?: string | null }[]
}

export type RawItem = { id: string; quantity: number | string }

const num = (v: unknown): number => Number(v ?? 0) || 0

export const activeFulfillments = (fs: RawFulfillment[] = []) =>
  fs.filter((f) => f && !f.canceled_at)

/** Line items (and quantities) still waiting to be put in a parcel. */
export function remainingItems(
  items: RawItem[] = [],
  fulfillments: RawFulfillment[] = []
): { id: string; quantity: number }[] {
  const done = new Map<string, number>()
  for (const f of activeFulfillments(fulfillments)) {
    for (const fi of f.items ?? []) {
      if (!fi.line_item_id) continue
      done.set(fi.line_item_id, (done.get(fi.line_item_id) ?? 0) + num(fi.quantity))
    }
  }
  return items
    .map((i) => ({ id: i.id, quantity: num(i.quantity) - (done.get(i.id) ?? 0) }))
    .filter((i) => i.quantity > 0)
}

export function deriveStage(
  items: RawItem[],
  fulfillments: RawFulfillment[]
): Stage {
  const active = activeFulfillments(fulfillments)
  if (active.length === 0 || remainingItems(items, fulfillments).length > 0) {
    return "to_ship"
  }
  if (active.every((f) => f.delivered_at)) return "delivered"
  if (active.some((f) => f.shipped_at)) return "shipped"
  return "label_ready"
}

export type PaymentState = "paid" | "cod" | "unpaid"

/**
 * COD orders authorize through the system provider and are collected on
 * delivery, so they are shippable without a captured payment. Everything else
 * must be captured before a parcel goes out.
 */
export function paymentState(
  collections: { status?: string | null; payments?: { provider_id?: string | null }[] }[] = []
): PaymentState {
  const isCod = collections.some((c) =>
    (c.payments ?? []).some((p) => (p.provider_id ?? "").startsWith("pp_system_default"))
  )
  if (isCod) return "cod"
  const paid = collections.some((c) => c.status === "completed" || c.status === "captured")
  return paid ? "paid" : "unpaid"
}

/** What the packer must fix before a label can be bought. */
export function missingForShipping(
  address:
    | {
        first_name?: string | null
        last_name?: string | null
        address_1?: string | null
        city?: string | null
        province?: string | null
        postal_code?: string | null
        country_code?: string | null
        phone?: string | null
      }
    | null
    | undefined,
  email?: string | null
): string[] {
  const a = address ?? {}
  return [
    ["name", `${a.first_name ?? ""}${a.last_name ?? ""}`.trim()],
    ["address", a.address_1],
    ["city", a.city],
    ["state", a.province],
    ["ZIP code", a.postal_code],
    ["country", a.country_code],
    ["phone", a.phone],
    ["email", email],
  ]
    .filter(([, v]) => !v)
    .map(([k]) => k as string)
}

/** Universal tracker link for carriers we don't have a direct URL for. */
export const genericTrackingUrl = (n: string) =>
  `https://parcelsapp.com/en/tracking/${encodeURIComponent(n)}`

export const isValidTrackingNumber = (n: unknown): n is string =>
  typeof n === "string" && /^[A-Za-z0-9\- ]{5,40}$/.test(n.trim())
