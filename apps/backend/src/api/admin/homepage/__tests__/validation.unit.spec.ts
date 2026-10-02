import { validateBody, isValidUrlValue, isValidDateValue } from "../validation"

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

  it("keeps the offer card design fields", () => {
    const card = {
      title: "Free delivery over $49",
      subtitle: "Anywhere in the US.",
      badge: "Free delivery",
      code: "MITHRA10",
      cta: "Start shopping",
      theme: "ghee",
      link: "/store",
    }
    const { payload, errors } = validateBody({ offer_cards: [card] })
    expect(errors).toEqual([])
    expect(payload.offer_cards).toEqual([card])
  })

  it("caps offer card badge length", () => {
    const { errors } = validateBody({
      offer_cards: [{ title: "x", badge: "b".repeat(41) }],
    })
    expect(errors[0]).toMatch(/offer_cards\[0\]\.badge must be at most 40/)
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

  it("keeps welcome card fields and a valid date window", () => {
    const { payload, errors } = validateBody({
      welcome_cards: [
        {
          badge: "Diwali",
          title: "Sweets for the festival",
          cta: "Shop sweets",
          link: "/categories/sweets",
          show_from: "2026-10-28",
          show_until: "2026-11-02",
          evil: "x",
        },
      ],
    })
    expect(errors).toEqual([])
    expect(payload.welcome_cards).toEqual([
      {
        badge: "Diwali",
        title: "Sweets for the festival",
        cta: "Shop sweets",
        link: "/categories/sweets",
        show_from: "2026-10-28",
        show_until: "2026-11-02",
      },
    ])
  })

  it("rejects malformed welcome card dates", () => {
    expect(isValidDateValue("2026-10-31")).toBe(true)
    expect(isValidDateValue("2026-02-30")).toBe(false)
    expect(isValidDateValue("31/10/2026")).toBe(false)
    const { errors } = validateBody({
      welcome_cards: [{ title: "x", show_from: "tomorrow" }],
    })
    expect(errors[0]).toMatch(/show_from must be a date/)
  })
})
