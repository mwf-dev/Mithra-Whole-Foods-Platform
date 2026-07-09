import { revalidateStorefront } from "../revalidate-storefront"

describe("revalidateStorefront", () => {
  const OLD_ENV = process.env
  let fetchMock: jest.Mock

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...OLD_ENV }
    delete process.env.STOREFRONT_URL
    delete process.env.REVALIDATE_SECRET
    fetchMock = jest.fn()
    global.fetch = fetchMock
    jest.spyOn(console, "warn").mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = OLD_ENV
    jest.restoreAllMocks()
  })

  it("skips the request when STOREFRONT_URL / REVALIDATE_SECRET are unset", async () => {
    await revalidateStorefront("/", "layout")
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("POSTs to /api/revalidate with the secret header when configured", async () => {
    process.env.STOREFRONT_URL = "https://shop.example.com/"
    process.env.REVALIDATE_SECRET = "s3cr3t"
    fetchMock.mockResolvedValue({ ok: true, status: 200 })

    await revalidateStorefront("/store", "page")

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    // trailing slash on STOREFRONT_URL must be collapsed
    expect(url).toBe("https://shop.example.com/api/revalidate")
    expect(init.method).toBe("POST")
    expect(init.headers["x-revalidate-secret"]).toBe("s3cr3t")
    expect(JSON.parse(init.body)).toEqual({ path: "/store", type: "page" })
  })

  it("defaults path to '/' and type to 'layout'", async () => {
    process.env.STOREFRONT_URL = "https://shop.example.com"
    process.env.REVALIDATE_SECRET = "s3cr3t"
    fetchMock.mockResolvedValue({ ok: true, status: 200 })

    await revalidateStorefront()

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toEqual({ path: "/", type: "layout" })
  })

  it("swallows a non-ok response without throwing", async () => {
    process.env.STOREFRONT_URL = "https://shop.example.com"
    process.env.REVALIDATE_SECRET = "s3cr3t"
    fetchMock.mockResolvedValue({ ok: false, status: 500 })

    await expect(revalidateStorefront()).resolves.toBeUndefined()
  })

  it("swallows a thrown fetch error without throwing", async () => {
    process.env.STOREFRONT_URL = "https://shop.example.com"
    process.env.REVALIDATE_SECRET = "s3cr3t"
    fetchMock.mockRejectedValue(new Error("network down"))

    await expect(revalidateStorefront()).resolves.toBeUndefined()
  })
})
