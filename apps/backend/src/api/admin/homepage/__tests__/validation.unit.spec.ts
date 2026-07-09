import { validateBody, isValidUrlValue } from "../validation"

describe("homepage settings validation", () => {
  it("accepts a valid payload and strips unknown fields", () => {
    const { payload, errors } = validateBody({
      hero_title: "Ancient Foods",
      hero_image_url: "/static/hero.png",
      id: "evil-override",
      created_at: "2020-01-01",
    })

    expect(errors).toEqual([])
    expect(payload).toEqual({
      hero_title: "Ancient Foods",
      hero_image_url: "/static/hero.png",
    })
    expect(payload).not.toHaveProperty("id")
  })

  it("rejects non-string values", () => {
    const { errors } = validateBody({ hero_title: { nested: "object" } })
    expect(errors).toContain("hero_title must be a string")
  })

  it("rejects over-length values", () => {
    const { errors } = validateBody({ hero_title: "x".repeat(301) })
    expect(errors[0]).toMatch(/at most 300/)
  })

  it("rejects javascript: and malformed URLs", () => {
    expect(isValidUrlValue("javascript:alert(1)")).toBe(false)
    expect(isValidUrlValue("not a url")).toBe(false)
    expect(isValidUrlValue("https://example.com/img.png")).toBe(true)
    expect(isValidUrlValue("/static/img.png")).toBe(true)
    expect(isValidUrlValue("")).toBe(true)
  })

  it("ignores absent fields (partial updates)", () => {
    const { payload, errors } = validateBody({})
    expect(errors).toEqual([])
    expect(payload).toEqual({})
  })

  it("accepts valid list fields and strips unknown item keys + empty items", () => {
    const { payload, errors } = validateBody({
      hero_banners: [
        { title: "Fresh Millets", image_url: "/static/b1.png", evil: "x" },
        { title: "", subtitle: "" }, // fully empty after cleaning → dropped
      ],
      offer_cards: [{ title: "Under ₹99", link: "/store" }],
    })
    expect(errors).toEqual([])
    expect(payload.hero_banners).toEqual([
      { title: "Fresh Millets", image_url: "/static/b1.png" },
    ])
    expect(payload.offer_cards).toEqual([{ title: "Under ₹99", link: "/store" }])
  })

  it("rejects non-array list fields and oversized lists", () => {
    const tooMany = Array.from({ length: 6 }, () => ({ title: "x" }))
    const { errors } = validateBody({
      hero_banners: "not-an-array",
      offer_cards: tooMany.concat(tooMany), // 12 > max 8
    })
    expect(errors).toContain("hero_banners must be an array")
    expect(errors.some((e) => e.includes("at most 8 items"))).toBe(true)
  })

  it("rejects invalid URLs inside list items", () => {
    const { errors } = validateBody({
      category_tiles: [{ name: "Millets", image_url: "javascript:alert(1)" }],
    })
    expect(errors[0]).toMatch(/category_tiles\[0\].image_url/)
  })
})
