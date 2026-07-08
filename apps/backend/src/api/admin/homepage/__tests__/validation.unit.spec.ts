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
})
