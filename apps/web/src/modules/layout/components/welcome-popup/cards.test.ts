import { describe, expect, it } from "vitest"
import { buildWelcomeCards } from "./cards"

describe("buildWelcomeCards", () => {
  it("offers the sign-up card to guests only", () => {
    expect(buildWelcomeCards(null, true).some((c) => c.kind === "signup")).toBe(true)
    expect(buildWelcomeCards(null, false).some((c) => c.kind === "signup")).toBe(false)
  })

  it("always has product cards, with real pack images and the pack's own claims", () => {
    const products = buildWelcomeCards(null, false).filter((c) => c.kind === "product")
    expect(products.length).toBeGreaterThanOrEqual(5)
    for (const p of products) {
      expect(p.image).toMatch(/^\/packs\//)
      expect(p.href.startsWith("/")).toBe(true)
    }
  })

  it("turns admin cards into custom cards and keeps only well-formed dates", () => {
    const cards = buildWelcomeCards(
      {
        welcome_cards: [
          { title: "Diwali sweets", link: "/categories/sweets", show_from: "2026-10-28", show_until: "2026-11-02" },
          { title: "Bad dates", show_from: "tomorrow" },
          { subtitle: "no title, dropped" },
        ],
      },
      false
    ).filter((c) => c.kind === "custom")
    expect(cards).toHaveLength(2)
    expect(cards[0]).toMatchObject({ title: "Diwali sweets", showFrom: "2026-10-28", showUntil: "2026-11-02", cta: "Shop now" })
    expect(cards[1].showFrom).toBeUndefined()
  })
})
