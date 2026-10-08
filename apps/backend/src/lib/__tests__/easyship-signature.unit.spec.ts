import crypto from "crypto"
import { isValidEasyshipSignature } from "../easyship-signature"

const secret = "whsec_test"
const body = '{"event_type":"tracking.status.changed"}'
const hex = crypto.createHmac("sha256", secret).update(body).digest("hex")
const b64 = crypto.createHmac("sha256", secret).update(body).digest("base64")

describe("isValidEasyshipSignature", () => {
  it("accepts hex, base64 and sha256= prefixed digests", () => {
    expect(isValidEasyshipSignature(body, hex, secret)).toBe(true)
    expect(isValidEasyshipSignature(body, b64, secret)).toBe(true)
    expect(isValidEasyshipSignature(body, `sha256=${hex}`, secret)).toBe(true)
  })

  it("rejects a wrong, tampered or empty signature", () => {
    expect(isValidEasyshipSignature(body, "deadbeef", secret)).toBe(false)
    expect(isValidEasyshipSignature(body + " ", hex, secret)).toBe(false)
    expect(isValidEasyshipSignature(body, "", secret)).toBe(false)
  })

  it("fails closed when the secret is unset", () => {
    expect(isValidEasyshipSignature(body, hex, "")).toBe(false)
  })
})
