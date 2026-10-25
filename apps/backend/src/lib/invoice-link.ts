import crypto from "crypto"

/**
 * Signed invoice links (C9): the order-confirmation email carries a link to
 * the invoice PDF that works without a logged-in customer (guest checkout has
 * no account to authenticate).
 *
 * The token is an HMAC of the order id, so it cannot be guessed or forged and
 * it pins the link to exactly one order. Trade-off (deliberate): the token
 * does not expire — anyone the email was sent to (and only them) can re-open
 * their invoice later. If the signing secret rotates, old links stop working.
 */

const SCOPE = "mwf-invoice:"

/**
 * Signing secret: INVOICE_LINK_SECRET when set, else COOKIE_SECRET (always
 * set in production — medusa-config throws otherwise). A literal dev/test
 * fallback keeps the feature working locally without env vars.
 */
export function invoiceSignSecret(): string | null {
  const explicit = process.env.INVOICE_LINK_SECRET
  if (explicit && !["", "mock"].includes(explicit)) return explicit
  if (process.env.COOKIE_SECRET && process.env.COOKIE_SECRET !== "supersecret") {
    return process.env.COOKIE_SECRET
  }
  if (process.env.JWT_SECRET && process.env.JWT_SECRET !== "supersecret") {
    return process.env.JWT_SECRET
  }
  return process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
    ? "dev-invoice-secret"
    : null
}

export function signInvoiceToken(orderId: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(`${SCOPE}${orderId}`).digest("base64url")
}

/** Constant-time check, false on any mismatch or missing input. */
export function verifyInvoiceToken(orderId: string, token: string, secret: string): boolean {
  if (!orderId || !token || !secret) return false
  const expected = Buffer.from(signInvoiceToken(orderId, secret))
  const given = Buffer.from(token)
  return expected.length === given.length && crypto.timingSafeEqual(expected, given)
}

/** Public backend URL for links inside emails (password-reset already uses it). */
function backendPublicUrl(): string {
  return (process.env.BACKEND_PUBLIC_URL || process.env.MEDUSA_BACKEND_URL || "").replace(/\/$/, "")
}

/** Full invoice URL for an order, or null when no public backend URL is set. */
export function invoiceLinkUrl(orderId: string): string | null {
  const secret = invoiceSignSecret()
  const base = backendPublicUrl()
  if (!secret || !base || !orderId) return null
  return `${base}/invoice/${orderId}?t=${signInvoiceToken(orderId, secret)}`
}
