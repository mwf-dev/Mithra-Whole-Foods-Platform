import crypto from "crypto"
import { isValidEasyshipSignature } from "../easyship-signature"
import { parseEasyshipEvent, parseShipmentResponse } from "../easyship-webhook"

describe("parseEasyshipEvent", () => {
  it("reads the flat legacy shape", () => {
    const e = parseEasyshipEvent({
      event_type: "tracking.status.changed",
      data: { tracking_number: "1Z1", status: "Delivered", easyship_shipment_id: "ESSG1" },
    })
    expect(e).toMatchObject({ trackingNumber: "1Z1", shipmentId: "ESSG1", status: "delivered" })
  })
  it("reads a nested shipment with trackings", () => {
    const e = parseEasyshipEvent({
      event_type: "shipment.tracking.status.changed",
      data: { easyship_shipment_id: "ESSG2", trackings: [{ tracking_number: "9400", tracking_state: "in_transit" }] },
    })
    expect(e).toMatchObject({ trackingNumber: "9400", shipmentId: "ESSG2", status: "in_transit" })
  })
  it("survives an empty payload", () => {
    expect(parseEasyshipEvent(undefined)).toMatchObject({ trackingNumber: "", shipmentId: "", status: "" })
  })
})

describe("parseShipmentResponse", () => {
  it("finds tracking, label and failure info", () => {
    const r = parseShipmentResponse({
      shipment: {
        easyship_shipment_id: "ESSG3",
        label_state: "generated",
        trackings: [{ tracking_number: "T1", tracking_page_url: "https://t/T1" }],
        shipping_documents: [{ type: "label", url: "https://l.pdf" }],
        courier_service: { name: "UPS Ground" },
      },
    })
    expect(r).toMatchObject({ id: "ESSG3", trackingNumber: "T1", labelUrl: "https://l.pdf", courier: "UPS Ground" })
  })
})

describe("JWT signatures", () => {
  const secret = "whsec"
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url")
  const head = enc({ alg: "HS256", typ: "JWT" })
  const body = enc({ a: 1 })
  const sig = crypto.createHmac("sha256", secret).update(`${head}.${body}`).digest("base64url")
  it("accepts a valid HS256 token and rejects a bad one", () => {
    expect(isValidEasyshipSignature("{}", `${head}.${body}.${sig}`, secret)).toBe(true)
    expect(isValidEasyshipSignature("{}", `${head}.${body}.${sig}x`, secret)).toBe(false)
    expect(isValidEasyshipSignature("{}", `${head}.${body}.${sig}`, "other")).toBe(false)
  })
})
