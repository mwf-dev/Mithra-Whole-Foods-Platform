import { createLoggedNotification, logOpsEvent } from "../ops-log"

function fakeContainer(svc: any) {
  return {
    resolve(key: string) {
      if (key === "ops_log") return svc
      if (key === "logger") return { warn: jest.fn() }
      throw new Error(`unexpected resolve(${key})`)
    },
  } as any
}

describe("logOpsEvent", () => {
  it("truncates long details and stores the payload", async () => {
    const created: any[] = []
    const svc = {
      createOpsLogEvents: (row: any) => {
        created.push(row)
        return Promise.resolve(row)
      },
    }
    await logOpsEvent(fakeContainer(svc), {
      kind: "webhook",
      source: "easyship",
      status: "failed",
      detail: "x".repeat(5000),
      reference: "1ZTRACK",
      payload: { status: "delivered" },
    })
    expect(created).toHaveLength(1)
    expect(created[0].detail.length).toBe(600)
    expect(created[0]).toMatchObject({ kind: "webhook", status: "failed", reference: "1ZTRACK" })
  })

  it("swallows module errors instead of throwing into the caller", async () => {
    const svc = {
      createOpsLogEvents: () => Promise.reject(new Error("down")),
    }
    await expect(
      logOpsEvent(fakeContainer(svc), { kind: "email", source: "resend", status: "ok" })
    ).resolves.toBeUndefined()
  })
})

describe("createLoggedNotification", () => {
  it("logs an ok row on success", async () => {
    const rows: any[] = []
    const container: any = {
      resolve(key: string) {
        if (key === "ops_log") {
          return { createOpsLogEvents: (r: any) => (rows.push(r), Promise.resolve(r)) }
        }
        return {
          createNotifications: () => Promise.resolve({ id: "res1" }),
        }
      },
    }
    await expect(
      createLoggedNotification(
        container,
        { to: "a@b.c", template: "order-placed", data: { x: 1 } },
        { orderId: "ord_1" }
      )
    ).resolves.toBeUndefined()
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      kind: "email",
      status: "ok",
      email: "a@b.c",
      order_id: "ord_1",
    })
  })

  it("logs the failure row and rethrows so the subscriber's own catch still runs", async () => {
    const rows: any[] = []
    const container: any = {
      resolve(key: string) {
        if (key === "ops_log") {
          return { createOpsLogEvents: (r: any) => (rows.push(r), Promise.resolve(r)) }
        }
        return { createNotifications: () => Promise.reject(new Error("boomed")) }
      },
    }
    await expect(
      createLoggedNotification(container, { to: "a@b.c", template: "t", data: {} })
    ).rejects.toThrow("boomed")
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: "email", status: "failed" })
    expect(String(rows[0].detail)).toContain("boomed")
  })
})
