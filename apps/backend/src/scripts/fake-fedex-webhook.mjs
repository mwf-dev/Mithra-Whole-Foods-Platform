#!/usr/bin/env node
/**
 * Fires a fake, correctly-signed FedEx webhook at a local Medusa backend so the
 * /webhooks/fedex route can be exercised without a real FedEx account.
 *
 * The signature is HMAC-SHA256 over the EXACT bytes we send, keyed with
 * FEDEX_WEBHOOK_SECRET — the same thing the route recomputes.
 *
 * Usage:
 *   node src/scripts/fake-fedex-webhook.mjs <trackingNumber> [eventType]
 *   node src/scripts/fake-fedex-webhook.mjs 12345 DLV
 *
 * Env:
 *   FEDEX_WEBHOOK_SECRET  (default: mytestsecret)
 *   WEBHOOK_URL           (default: http://localhost:9000/webhooks/fedex)
 *   BAD_SIG=1             send a deliberately wrong signature (expect 401)
 *   NO_SIG=1              send no signature header at all (expect 401)
 *   PRETTY=1              send whitespace-formatted JSON, to prove whether the
 *                         route verifies raw bytes or a re-stringified body
 */
import crypto from "node:crypto"

const trackingNumber = process.argv[2] ?? "12345"
const eventType = process.argv[3] ?? "DLV"
const secret = process.env.FEDEX_WEBHOOK_SECRET ?? "mytestsecret"
const url = process.env.WEBHOOK_URL ?? "http://localhost:9000/webhooks/fedex"

// Shaped after FedEx's Track Notification push payload. The route only reads
// trackEvents[].trackingNumber and trackEvents[].eventType.
const payload = {
  transactionId: `test-${Date.now()}`,
  trackEvents: [
    {
      trackingNumber,
      eventType,
      eventDescription: eventType === "DLV" ? "Delivered" : eventType,
      timestamp: new Date().toISOString(),
    },
  ],
}

// The exact bytes on the wire — sign these, don't re-serialize.
const body = process.env.PRETTY
  ? JSON.stringify(payload, null, 2)
  : JSON.stringify(payload)

// FedEx Supply Chain's own example is base64, not hex:
//   base64_encode(hash_hmac('sha256', $data, $secret, true))
let signature = crypto.createHmac("sha256", secret).update(body).digest("base64")
if (process.env.BAD_SIG) {
  signature = Buffer.alloc(32).toString("base64")
}

const headers = { "Content-Type": "application/json" }
if (!process.env.NO_SIG) {
  headers["x-fdx-sc-signature"] = signature
}

console.log(`POST ${url}`)
console.log(`  tracking=${trackingNumber} event=${eventType}`)
console.log(`  body bytes=${Buffer.byteLength(body)} pretty=${!!process.env.PRETTY}`)
console.log(`  signature=${process.env.NO_SIG ? "(omitted)" : signature}`)

const res = await fetch(url, { method: "POST", headers, body })
const text = await res.text()
console.log(`\n<- HTTP ${res.status}`)
console.log(`<- ${text}`)

process.exit(res.ok ? 0 : 1)
