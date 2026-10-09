/**
 * Who may open what in the admin.
 *
 * Two kinds of login:
 *  - **Super admin** — an email listed in SUPER_ADMIN_EMAILS (and that exists as
 *    a user). Sees and can do everything, and decides what the client sees.
 *  - **Client admin** — every other admin user. Sees only the sections the
 *    super admin has left switched on, and never the technical ones.
 *
 * Kept free of Medusa imports so the rules are unit-tested. The server-side
 * guard (src/api/admin-access-guard.ts) is what actually enforces them; hiding
 * a menu item (the injected nav script) is only cosmetic.
 */

export type SectionKey =
  | "dashboard"
  | "ship_orders"
  | "product_studio"
  | "homepage"
  | "content_briefs"
  | "reviews"
  | "orders"
  | "products"
  | "inventory"
  | "customers"
  | "promotions"
  | "price_lists"

export type Section = {
  key: SectionKey
  label: string
  description: string
  group: "Store tools" | "Medusa"
  /** Sidebar link prefixes (without the /app base) hidden when switched off. */
  nav: string[]
  /** API prefixes refused for a client when switched off. */
  api: string[]
}

export const SECTIONS: Section[] = [
  { key: "dashboard", label: "Dashboard", description: "Sales charts and the dispatch overview.", group: "Store tools", nav: ["/dashboard"], api: ["/admin/dashboard-stats"] },
  { key: "ship_orders", label: "Ship orders", description: "Pack, buy labels, print slips, mark shipped.", group: "Store tools", nav: ["/ship-orders"], api: ["/admin/ship-orders"] },
  { key: "product_studio", label: "Product studio", description: "Edit products as customers see them; show or hide them.", group: "Store tools", nav: ["/product-studio"], api: ["/admin/catalog-manager"] },
  { key: "homepage", label: "Homepage", description: "Edit the website's home page and welcome popup.", group: "Store tools", nav: ["/homepage"], api: ["/admin/homepage"] },
  { key: "content_briefs", label: "Content briefs", description: "Review the product content the client submits.", group: "Store tools", nav: ["/content-briefs"], api: ["/admin/content-briefs"] },
  { key: "reviews", label: "Product reviews", description: "Approve or reject customer reviews.", group: "Store tools", nav: ["/product-reviews"], api: ["/admin/product-reviews"] },
  { key: "orders", label: "Orders (Medusa)", description: "Medusa's full orders screens, returns and edits.", group: "Medusa", nav: ["/orders", "/draft-orders"], api: ["/admin/orders", "/admin/draft-orders", "/admin/order-edits", "/admin/returns", "/admin/claims", "/admin/exchanges"] },
  { key: "products", label: "Products (Medusa)", description: "Medusa's product, category and collection screens.", group: "Medusa", nav: ["/products", "/categories", "/collections"], api: ["/admin/products", "/admin/product-categories", "/admin/collections", "/admin/product-tags", "/admin/product-types"] },
  { key: "inventory", label: "Inventory", description: "Stock levels and reservations.", group: "Medusa", nav: ["/inventory", "/reservations"], api: ["/admin/inventory-items", "/admin/reservations"] },
  { key: "customers", label: "Customers", description: "Customer list and groups.", group: "Medusa", nav: ["/customers", "/customer-groups"], api: ["/admin/customers", "/admin/customer-groups"] },
  { key: "promotions", label: "Promotions", description: "Discount codes and campaigns.", group: "Medusa", nav: ["/promotions", "/campaigns"], api: ["/admin/promotions", "/admin/campaigns"] },
  { key: "price_lists", label: "Price lists", description: "Special and sale pricing.", group: "Medusa", nav: ["/price-lists"], api: ["/admin/price-lists"] },
]

/** Pages only a super admin ever sees (not switchable). */
export const SUPER_ONLY_NAV = ["/platform", "/control-center", "/settings/users", "/settings/api-key-management", "/settings/secret-api-keys", "/settings/publishable-api-keys"]

/** API prefixes only a super admin may call, regardless of any switch. */
export const SUPER_ONLY_API = [
  "/admin/platform",
  "/admin/usage",
  "/admin/client-access",
  "/admin/invites",
  "/admin/api-keys",
]

export const SECTION_KEYS = SECTIONS.map((s) => s.key)

export type SectionState = Record<SectionKey, boolean>

export const defaultSections = (): SectionState =>
  Object.fromEntries(SECTION_KEYS.map((k) => [k, true])) as SectionState

/** Merge stored switches over the defaults; unknown keys are ignored. */
export function normalizeSections(stored: unknown): SectionState {
  const out = defaultSections()
  if (stored && typeof stored === "object") {
    for (const k of SECTION_KEYS) {
      const v = (stored as Record<string, unknown>)[k]
      if (typeof v === "boolean") out[k] = v
    }
  }
  return out
}

export const parseSuperEmails = (raw: string | undefined | null): string[] =>
  String(raw ?? "")
    .split(/[,\s;]+/)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes("@"))

export type AccessContext = {
  /** Enforcement is on only once a listed super-admin email matches a real user. */
  enforced: boolean
  isSuper: boolean
  actorId: string | null
  sections: SectionState
}

export type Decision = { allow: true } | { allow: false; reason: string }

const matches = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + "/")

/**
 * Decide whether `method path` may proceed for this actor. Only authenticated
 * admin users reach this (the guard skips anonymous requests so Medusa's own
 * auth, login and invite-accept flows are untouched).
 */
export function decide(method: string, rawPath: string, ctx: AccessContext): Decision {
  if (!ctx.enforced || ctx.isSuper) return { allow: true }
  const path = rawPath.split("?")[0].replace(/\/+$/, "") || "/"
  const m = method.toUpperCase()

  // The admin shell and this feature's own "what may I see" lookup always work.
  if (matches(path, "/admin/my-access")) return { allow: true }

  for (const p of SUPER_ONLY_API) {
    if (matches(path, p)) return { allow: false, reason: "This area is for the site administrator." }
  }

  // Users: everyone may read (the shell needs /users/me); only super may
  // create/delete/modify other people. Self-edit (name, avatar) stays allowed.
  if (matches(path, "/admin/users") && m !== "GET") {
    const id = path.split("/")[3]
    const self = id && (id === "me" || id === ctx.actorId)
    if (!self || m === "DELETE") return { allow: false, reason: "Managing users is for the site administrator." }
  }

  for (const s of SECTIONS) {
    if (ctx.sections[s.key]) continue
    if (s.api.some((p) => matches(path, p))) {
      return { allow: false, reason: `${s.label} isn't enabled for your account.` }
    }
  }
  return { allow: true }
}

/** Sidebar link prefixes to hide for a client (empty for a super admin). */
export function hiddenNav(ctx: Pick<AccessContext, "enforced" | "isSuper" | "sections">): string[] {
  if (!ctx.enforced || ctx.isSuper) return []
  const hidden = [...SUPER_ONLY_NAV]
  for (const s of SECTIONS) if (!ctx.sections[s.key]) hidden.push(...s.nav)
  return hidden
}
