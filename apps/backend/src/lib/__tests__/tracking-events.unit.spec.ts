import { appendEvent, normalizeStatus, publicTimeline, readEvents } from "../tracking-events"

const ev = (status: any, at = "2026-10-24T10:00:00Z") => ({ status, at, source: "easyship" as const })

describe("tracking-events", () => {
  it("normalises carrier strings", () => {
    expect(normalizeStatus("In Transit")).toBe("in_transit")
    expect(normalizeStatus("out-for-delivery")).toBe("out_for_delivery")
    expect(normalizeStatus("delivered_to_customer")).toBe("delivered")
    expect(normalizeStatus("delivery_exception")).toBe("exception")
    expect(normalizeStatus("")).toBeNull()
    expect(normalizeStatus("something_new")).toBeNull()
  })

  it("appends in order and ignores a repeated status", () => {
    let m: any = {}
    m = appendEvent(m, ev("in_transit")).metadata
    const dup = appendEvent(m, ev("in_transit", "2026-10-24T11:00:00Z"))
    expect(dup.added).toBe(false)
    m = appendEvent(dup.metadata, ev("out_for_delivery")).metadata
    expect(readEvents(m).map((e) => e.status)).toEqual(["in_transit", "out_for_delivery"])
  })

  it("ignores stale events after delivered", () => {
    let m: any = appendEvent({}, ev("delivered")).metadata
    expect(appendEvent(m, ev("in_transit")).added).toBe(false)
  })

  it("keeps unrelated metadata and hides internals from customers", () => {
    const m: any = appendEvent({ delivery_method: "manual" }, { ...ev("in_transit"), note: "driver Sam" }).metadata
    expect(m.delivery_method).toBe("manual")
    expect(JSON.stringify(publicTimeline(m))).not.toContain("driver Sam")
  })
})
