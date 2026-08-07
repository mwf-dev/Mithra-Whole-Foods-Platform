import { describe, expect, it } from "vitest"

import { cloudinaryUrl } from "./cloudinary"

const ORIGINAL =
  "https://res.cloudinary.com/zwo66f4s/image/upload/v1783943941/mithra-wholefoods/11f9b16a.png.png"

describe("cloudinaryUrl", () => {
  it("injects transforms after the upload segment", () => {
    expect(cloudinaryUrl(ORIGINAL, { width: 640 })).toBe(
      "https://res.cloudinary.com/zwo66f4s/image/upload/f_auto,q_auto,dpr_auto,w_640,c_limit/v1783943941/mithra-wholefoods/11f9b16a.png.png"
    )
  })

  it("omits width when none is given", () => {
    expect(cloudinaryUrl(ORIGINAL)).toBe(
      "https://res.cloudinary.com/zwo66f4s/image/upload/f_auto,q_auto,dpr_auto/v1783943941/mithra-wholefoods/11f9b16a.png.png"
    )
  })

  it("never upscales — c_limit is always paired with a width", () => {
    const out = cloudinaryUrl(ORIGINAL, { width: 256 })
    expect(out).toContain("w_256,c_limit")
  })

  it("leaves an already-transformed URL alone", () => {
    // An admin who hand-tunes a crop must not be silently overridden.
    const tuned =
      "https://res.cloudinary.com/zwo66f4s/image/upload/c_fill,g_face,w_400/v1783943941/x.png"
    expect(cloudinaryUrl(tuned, { width: 640 })).toBe(tuned)
  })

  it("passes non-Cloudinary URLs through untouched", () => {
    // Local `static/` uploads are the fallback whenever CLOUDINARY_* is unset.
    for (const url of [
      "http://localhost:9000/static/hero.png",
      "https://placehold.co/1920x800",
      "data:image/png;base64,iVBORw0KGgo=",
      "/static/local.png",
    ]) {
      expect(cloudinaryUrl(url, { width: 640 })).toBe(url)
    }
  })

  it("returns an empty string for empty input", () => {
    expect(cloudinaryUrl(null)).toBe("")
    expect(cloudinaryUrl(undefined)).toBe("")
    expect(cloudinaryUrl("")).toBe("")
  })

  it("survives the double-extension names the uploader produces", () => {
    // Real assets are stored as `<uuid>_2026-07-13_13.29.07.png.png`.
    const messy =
      "https://res.cloudinary.com/zwo66f4s/image/upload/v1/mithra-wholefoods/a_2026-07-13_13.29.07.png.png"
    expect(cloudinaryUrl(messy, { width: 640 })).toContain(
      "/upload/f_auto,q_auto,dpr_auto,w_640,c_limit/v1/"
    )
  })
})
