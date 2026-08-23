import {
  briefToYaml,
  checkStudioToken,
  countFilledSlides,
  isEmptyBrief,
  normalizeSlides,
  normalizeSummary,
  sanitizeLink,
  MAX_SLIDES,
  MAX_IMAGES_PER_SLIDE,
} from "../content-studio"

describe("checkStudioToken", () => {
  const original = process.env.CONTENT_STUDIO_TOKEN

  afterEach(() => {
    if (original === undefined) delete process.env.CONTENT_STUDIO_TOKEN
    else process.env.CONTENT_STUDIO_TOKEN = original
  })

  it("is 503, not 401, when the feature is switched off", () => {
    delete process.env.CONTENT_STUDIO_TOKEN
    const result = checkStudioToken("anything")
    expect(result).toMatchObject({ ok: false, status: 503 })
  })

  it("refuses a token short enough to brute-force even if it matches", () => {
    process.env.CONTENT_STUDIO_TOKEN = "short"
    expect(checkStudioToken("short")).toMatchObject({ ok: false, status: 503 })
  })

  it("accepts the exact token and rejects everything else", () => {
    process.env.CONTENT_STUDIO_TOKEN = "a-sufficiently-long-token-value"
    expect(checkStudioToken("a-sufficiently-long-token-value")).toEqual({ ok: true })
    expect(checkStudioToken("a-sufficiently-long-token-valu")).toMatchObject({ status: 401 })
    expect(checkStudioToken(undefined)).toMatchObject({ status: 401 })
    expect(checkStudioToken(12345)).toMatchObject({ status: 401 })
  })
})

describe("sanitizeLink", () => {
  it("keeps http and https", () => {
    expect(sanitizeLink("https://example.com/a")).toBe("https://example.com/a")
    expect(sanitizeLink("http://example.com/a")).toBe("http://example.com/a")
  })

  it("upgrades a bare domain to https", () => {
    expect(sanitizeLink("pinterest.com/pin/123")).toBe("https://pinterest.com/pin/123")
  })

  it("drops script-bearing and non-web schemes", () => {
    // The reviewer's admin page renders these as anchors, so a javascript:
    // URL stored here would be stored XSS aimed at us, not at the client.
    expect(sanitizeLink("javascript:alert(1)")).toBeNull()
    expect(sanitizeLink("data:text/html,<script>alert(1)</script>")).toBeNull()
    expect(sanitizeLink("  ")).toBeNull()
    expect(sanitizeLink(null)).toBeNull()
  })
})

describe("normalizeSlides", () => {
  it("fills in missing fields and generates ids", () => {
    const [slide] = normalizeSlides([{ name: "Benefits" }])
    expect(slide.name).toBe("Benefits")
    expect(slide.content).toBe("")
    expect(slide.links).toEqual([])
    expect(slide.images).toEqual([])
    expect(slide.id).toBeTruthy()
  })

  it("de-duplicates ids so two slides can never collide", () => {
    const slides = normalizeSlides([{ id: "same" }, { id: "same" }])
    expect(slides[0].id).not.toBe(slides[1].id)
  })

  it("strips images whose url is not a real http(s) link", () => {
    const [slide] = normalizeSlides([
      {
        images: [
          { url: "https://cdn.example.com/a.jpg", key: "k", filename: "a.jpg" },
          { url: "javascript:alert(1)" },
          { nope: true },
        ],
      },
    ])
    expect(slide.images).toHaveLength(1)
    expect(slide.images[0].url).toBe("https://cdn.example.com/a.jpg")
  })

  it("caps slides and images so one save cannot store unbounded JSON", () => {
    const many = Array.from({ length: MAX_SLIDES + 8 }, (_, i) => ({ name: `s${i}` }))
    expect(normalizeSlides(many)).toHaveLength(MAX_SLIDES)

    const images = Array.from({ length: MAX_IMAGES_PER_SLIDE + 5 }, (_, i) => ({
      url: `https://cdn.example.com/${i}.jpg`,
    }))
    expect(normalizeSlides([{ images }])[0].images).toHaveLength(MAX_IMAGES_PER_SLIDE)
  })

  it("ignores junk instead of throwing", () => {
    expect(normalizeSlides(null)).toEqual([])
    expect(normalizeSlides("nope" as unknown)).toEqual([])
    expect(normalizeSlides([null, 5, "x"])).toEqual([])
  })
})

describe("progress helpers", () => {
  it("treats a brief with only empty slides as not started", () => {
    const summary = normalizeSummary({})
    const slides = normalizeSlides([{ name: "" }, { name: "" }])
    expect(isEmptyBrief(summary, slides)).toBe(true)
  })

  it("a named-but-empty slide still counts as not filled", () => {
    const slides = normalizeSlides([{ name: "Benefits" }])
    expect(countFilledSlides(slides)).toBe(0)
    expect(countFilledSlides(normalizeSlides([{ name: "Benefits", content: "x" }]))).toBe(1)
  })

  it("one uploaded image is enough to count", () => {
    const slides = normalizeSlides([{ images: [{ url: "https://cdn.example.com/a.jpg" }] }])
    expect(countFilledSlides(slides)).toBe(1)
  })
})

describe("briefToYaml", () => {
  it("renders slides in order with their copy and images", () => {
    const yaml = briefToYaml({
      product_title: "Sastra Pure Cow Ghee",
      product_handle: "sastra-ghee",
      status: "submitted",
      updated_by: "Priya",
      summary: { tagline: "Slow Cooked. Never Hurried.", links: ["example.com/ref"] },
      slides: [
        { name: "Packshot", content: "No text." },
        {
          name: "Benefits",
          content: "Rich Golden Aroma\nHigh Smoke Point",
          images: [{ url: "https://cdn.example.com/b.jpg" }],
        },
      ],
    })

    expect(yaml).toContain('product_name: "Sastra Pure Cow Ghee"')
    expect(yaml).toContain("- number: 1")
    expect(yaml).toContain("- number: 2")
    expect(yaml.indexOf("Packshot")).toBeLessThan(yaml.indexOf("Benefits"))
    expect(yaml).toContain("https://cdn.example.com/b.jpg")
    // Multi-line copy must survive as a YAML block, not a broken scalar.
    expect(yaml).toContain("|-")
  })

  it("produces valid-looking output for an untouched brief", () => {
    const yaml = briefToYaml({ product_title: "Thing" })
    expect(yaml).toContain("slides:")
    expect(yaml).toContain("  []")
  })
})
