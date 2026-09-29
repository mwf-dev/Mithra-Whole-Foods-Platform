import { beforeEach, describe, expect, it, vi } from "vitest"

import { getCacheOptions, getCacheTag } from "./cookies"

/**
 * Covers the cache-tag rule that decides whether an admin edit can ever reach
 * a shopper.
 *
 * Catalog tags must NOT carry the per-browser `_medusa_cache_id`: the Data
 * Cache is keyed by URL, so one shared entry would be tagged with whichever
 * visitor populated it and no purge could reach it. Per-user tags must keep it.
 */

const cookieStore = new Map<string, string>()

vi.mock("server-only", () => ({}))
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieStore.get(name)
      return value ? { name, value } : undefined
    },
  }),
}))

const BROWSER_ID = "11111111-2222-3333-4444-555555555555"

beforeEach(() => {
  cookieStore.clear()
  cookieStore.set("_medusa_cache_id", BROWSER_ID)
})

describe("getCacheTag", () => {
  it.each([
    "products",
    "categories",
    "collections",
    "regions",
    "variants",
    "locales",
    "payment_providers",
  ])("returns %s unsuffixed so every visitor shares one purgeable tag", async (tag) => {
    expect(await getCacheTag(tag)).toBe(tag)
  })

  it("treats a suffixed catalog tag as global too", async () => {
    // regions.ts tags a single region as `regions-<id>`
    expect(await getCacheTag("regions-reg_01")).toBe("regions-reg_01")
  })

  it("treats per-product review tags as global", async () => {
    expect(await getCacheTag("product-reviews-prod_01")).toBe(
      "product-reviews-prod_01"
    )
  })

  it.each(["customers", "orders", "fulfillment", "shippingOptions"])(
    "keeps %s scoped to the browser",
    async (tag) => {
      expect(await getCacheTag(tag)).toBe(`${tag}-${BROWSER_ID}`)
    }
  )

  it("still tags catalog data when the browser cookie is absent", async () => {
    cookieStore.clear()
    expect(await getCacheTag("products")).toBe("products")
  })

  it("returns no tag for per-user data when the browser cookie is absent", async () => {
    cookieStore.clear()
    expect(await getCacheTag("customers")).toBe("")
  })
})

describe("getCacheOptions", () => {
  it("gives catalog reads a TTL floor so a missed purge expires on its own", async () => {
    expect(await getCacheOptions("products")).toEqual({
      tags: ["products"],
      revalidate: 300,
    })
  })

  it("leaves per-user reads purge-only", async () => {
    expect(await getCacheOptions("customers")).toEqual({
      tags: [`customers-${BROWSER_ID}`],
    })
  })

  it("returns no options when there is no tag to attach", async () => {
    cookieStore.clear()
    expect(await getCacheOptions("orders")).toEqual({})
  })
})
