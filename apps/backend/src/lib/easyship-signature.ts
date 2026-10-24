import crypto from "crypto"

/** HMAC-SHA256 check for Easyship webhooks. Fails closed on a missing secret or signature. */
export function isValidEasyshipSignature(
  rawBody: Buffer | string,
  provided: string,
  secret: string
): boolean {
  if (!secret || !provided) return false

  // Easyship may sign with a JWT (HS256) instead of a body digest.
  if (isValidJwt(provided, secret)) return true

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

const b64url = (b: Buffer) => b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")

function isValidJwt(token: string, secret: string): boolean {
  const parts = token.replace(/^Bearer\s+/i, "").split(".")
  if (parts.length !== 3) return false
  try {
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"))
    if (header?.alg !== "HS256") return false
  } catch {
    return false
  }
  const expected = Buffer.from(b64url(crypto.createHmac("sha256", secret).update(`${parts[0]}.${parts[1]}`).digest()))
  const given = Buffer.from(parts[2])
  return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}
