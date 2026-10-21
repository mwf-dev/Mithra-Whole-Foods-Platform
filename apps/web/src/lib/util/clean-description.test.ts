import { describe, expect, it } from "vitest"

import { cleanDescription } from "./clean-description"

describe("cleanDescription", () => {
  it("returns empty for null, undefined and blank", () => {
    expect(cleanDescription(null)).toBe("")
    expect(cleanDescription(undefined)).toBe("")
    expect(cleanDescription("   ")).toBe("")
  })

  it("decodes the entities the old catalogue used", () => {
    expect(cleanDescription("Extra&nbsp;Virgin &amp; Cold-pressed")).toBe("Extra Virgin & Cold-pressed")
  })

  it("removes the trailing Tags block", () => {
    const raw = "Cold Pressed Castor Oil. 100% natural.\n                      Tags: \n                              Cold Pressed Castor Oil"
    expect(cleanDescription(raw)).toBe("Cold Pressed Castor Oil. 100% natural.")
  })

  it("is empty when only a Tags block is present", () => {
    expect(cleanDescription("Tags: \n  Black Chana,\n  Chickpeas")).toBe("")
  })

  it("collapses whitespace across lines into one paragraph", () => {
    expect(cleanDescription("Line one   here\n\n  line two")).toBe("Line one here line two")
  })

  it("leaves a clean description untouched", () => {
    expect(cleanDescription("Pure solid jaggery made from sugarcane juice.")).toBe(
      "Pure solid jaggery made from sugarcane juice."
    )
  })
})
