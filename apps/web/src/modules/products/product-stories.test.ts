import { describe, expect, it } from "vitest"

import { STORIES, storyForProduct } from "./product-stories"

/**
 * Story copy must stay culinary. These words are disease, treatment or
 * "boosts/prevents" claims, which the client has not been cleared to make.
 */
const CLAIM_WORDS =
  /\b(cure[sd]?|treat(ed|ment)|diabet\w*|cholesterol|cancer|an(a)?emi\w*|immun\w*|inflammat\w*|disease\w*|prevent\w*|detox\w*|weight[- ]loss|blood[- ]sugar|glyc(a)?emic|medicin\w*|remed\w*|heal(s|ing|th(y)?)?|boosts?|therapeutic|antioxidant\w*)\b/i

const text = (s: (typeof STORIES)[string]) =>
  [
    s.eyebrow,
    s.headline,
    ...s.intro,
    ...(s.facts ?? []),
    s.pointsHeading ?? "",
    ...s.points.flatMap((p) => [p.title, p.text]),
    s.uses?.heading ?? "",
    ...(s.uses?.items ?? []),
    s.note?.title ?? "",
    s.note?.text ?? "",
    s.closingHeading ?? "",
    s.closing ?? "",
    s.signoff ?? "",
  ].join("\n")

describe("product stories", () => {
  const entries = Object.entries(STORIES)

  it("covers the whole catalogue (82 products at last count)", () => {
    expect(entries.length).toBeGreaterThanOrEqual(82)
  })

  it.each(entries)("%s has a well-formed story", (_handle, s) => {
    expect(s.eyebrow.length).toBeGreaterThan(3)
    expect(s.headline.length).toBeGreaterThan(8)
    expect(s.intro.length).toBeGreaterThanOrEqual(1)
    expect(s.points.length).toBeGreaterThanOrEqual(3)
    expect(s.points.length).toBeLessThanOrEqual(7)
    if (s.facts) expect(s.facts.length).toBeLessThanOrEqual(4)
    // Titles key the React list, so they must be unique within a story.
    expect(new Set(s.points.map((p) => p.title)).size).toBe(s.points.length)
  })

  it.each(entries)("%s makes no health or treatment claims", (handle, s) => {
    // The client's own Rajabogam copy mentions "rich mineral content"; it is
    // the one sentence not written here and is checked separately below.
    // "Health Mix" is a product name, and "a treat" is food, not medicine.
    const body =
      handle === "mithra-rajabogam-ponni-boiled-rice"
        ? ""
        : text(s).replace(/health (mix(es)?|drink)/gi, "")
    const hit = body.match(CLAIM_WORDS)
    expect(hit?.[0] ?? null).toBeNull()
  })

  it("storyForProduct looks up by handle and tolerates unknowns", () => {
    expect(storyForProduct("mithra-idli-podi-200g")?.eyebrow).toContain("Idli Podi")
    expect(storyForProduct("nope")).toBeNull()
    expect(storyForProduct(null)).toBeNull()
    expect(storyForProduct(undefined)).toBeNull()
  })
})
