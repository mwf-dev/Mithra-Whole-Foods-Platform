import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { POST } from "./route"

const revalidateTag = vi.fn()
const revalidatePath = vi.fn()

vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => revalidateTag(...args),
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}))

const SECRET = "s3cr3t"

const call = (body: unknown, secret: string | null = SECRET) =>
  POST(
    new Request("https://shop.example.com/api/revalidate", {
      method: "POST",
      headers: secret ? { "x-revalidate-secret": secret } : {},
      body: JSON.stringify(body),
    }) as any
  )

beforeEach(() => {
  vi.clearAllMocks()
  process.env.REVALIDATE_SECRET = SECRET
})

afterEach(() => {
  delete process.env.REVALIDATE_SECRET
})

describe("POST /api/revalidate", () => {
  it("purges every requested tag", async () => {
    const res = await call({ tags: ["products", "categories"] })

    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      revalidated: true,
      tags: ["products", "categories"],
      path: null,
    })
    expect(revalidateTag.mock.calls).toEqual([["products"], ["categories"]])
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("still accepts the original path form", async () => {
    const res = await call({ path: "/", type: "layout" })

    expect(res.status).toBe(200)
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout")
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("accepts tags and a path together", async () => {
    await call({ tags: ["products"], path: "/us/store" })

    expect(revalidateTag).toHaveBeenCalledWith("products")
    expect(revalidatePath).toHaveBeenCalledWith("/us/store")
  })

  it("rejects a request carrying neither", async () => {
    const res = await call({})

    expect(res.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("rejects non-string tags rather than purging the valid ones", async () => {
    const res = await call({ tags: ["products", 42] })

    expect(res.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("caps the number of tags per request", async () => {
    const res = await call({ tags: Array.from({ length: 21 }, (_, i) => `t${i}`) })

    expect(res.status).toBe(400)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("refuses a wrong secret", async () => {
    const res = await call({ tags: ["products"] }, "wrong")

    expect(res.status).toBe(401)
    expect(revalidateTag).not.toHaveBeenCalled()
  })

  it("reports 503 when revalidation is not configured", async () => {
    delete process.env.REVALIDATE_SECRET

    const res = await call({ tags: ["products"] })

    expect(res.status).toBe(503)
    expect(revalidateTag).not.toHaveBeenCalled()
  })
})
