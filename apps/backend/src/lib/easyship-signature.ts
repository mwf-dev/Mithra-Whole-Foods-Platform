import crypto from "crypto"

/** HMAC-SHA256 check for Easyship webhooks. Fails closed on a missing secret or signature. */
export function isValidEasyshipSignature(
  rawBody: Buffer | string,
  provided: string,
  secret: string
): boolean {
  if (!secret || !provided) return false

  const candidate = provided.replace(/^sha256=/, "")
  const mac = crypto.createHmac("sha256", secret).update(rawBody)
  const digest = mac.digest()

  // Easyship may send the digest hex- or base64-encoded.
  const encodings: Array<"hex" | "base64"> = ["hex", "base64"]
  return encodings.some((enc) => {
    const expected = Buffer.from(digest.toString(enc))
    const given = Buffer.from(candidate)
    return expected.length === given.length && crypto.timingSafeEqual(expected, given)
  })
}
