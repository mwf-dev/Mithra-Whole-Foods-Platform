import * as crypto from "crypto"

/**
 * Encryption for third-party API tokens held in `platform_connection`.
 *
 * Why encrypt at all, given the row is already behind admin auth: these are
 * *other people's* credentials — the client's Vercel, Railway, Neon and
 * Cloudinary accounts. A database dump, a `pg_dump` in a backup bucket, or a
 * read-only analytics replica should not hand someone a working Railway token.
 * Encrypting narrows the blast radius of a database compromise to "they also
 * need the app's secret".
 *
 * AES-256-GCM, random 12-byte IV per value, auth tag appended. Stored as
 * `v1.<iv-b64>.<tag-b64>.<ciphertext-b64>` so the format can be migrated later
 * without guessing.
 *
 * ## Key material
 *
 * `PLATFORM_MONITOR_SECRET` if set, else `COOKIE_SECRET`, else `JWT_SECRET`.
 * Both fallbacks are already required to be strong and unique in production
 * (`medusa-config.ts` throws otherwise), so this inherits that guarantee rather
 * than adding a fifth secret nobody sets. Set the dedicated variable if you
 * ever want to rotate session secrets without re-entering every vendor token.
 *
 * Rotating the key makes existing ciphertext undecryptable — by design.
 * `decrypt` returns `null` rather than throwing, the connection reports
 * `unconfigured`, and the operator re-enters the token in the admin UI. A
 * monitoring tool must never take the backend down over its own key rotation.
 */

const VERSION = "v1"

let cachedKey: Buffer | null = null

function secretMaterial(): string | null {
  return (
    process.env.PLATFORM_MONITOR_SECRET ||
    process.env.COOKIE_SECRET ||
    process.env.JWT_SECRET ||
    null
  )
}

/** Derived once per process; scrypt is deliberately slow. */
function key(): Buffer {
  if (cachedKey) {
    return cachedKey
  }

  const material = secretMaterial()
  if (!material) {
    throw new Error(
      "platform-monitor: no secret available to encrypt credentials " +
        "(set PLATFORM_MONITOR_SECRET, COOKIE_SECRET or JWT_SECRET)"
    )
  }

  // Fixed salt: the secret is already high-entropy and per-deployment, and a
  // random salt would have to be stored next to every ciphertext for no gain
  // against the threat this defends (an offline copy of the database alone).
  cachedKey = crypto.scryptSync(material, "mithra-platform-monitor", 32)
  return cachedKey
}

/** True when credentials can be stored at all. Surfaced by the health route. */
export function canEncrypt(): boolean {
  return Boolean(secretMaterial())
}

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(".")
}

/** Returns `null` on any failure — wrong key, tampering, or a legacy format. */
export function decrypt(payload: string | null | undefined): string | null {
  if (!payload) {
    return null
  }

  const parts = payload.split(".")
  if (parts.length !== 4 || parts[0] !== VERSION) {
    return null
  }

  try {
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(parts[1], "base64")
    )
    decipher.setAuthTag(Buffer.from(parts[2], "base64"))
    return Buffer.concat([
      decipher.update(Buffer.from(parts[3], "base64")),
      decipher.final(),
    ]).toString("utf8")
  } catch {
    return null
  }
}

export function encryptJson(value: Record<string, string>): string {
  return encrypt(JSON.stringify(value))
}

export function decryptJson(
  payload: string | null | undefined
): Record<string, string> | null {
  const plain = decrypt(payload)
  if (!plain) {
    return null
  }

  try {
    const parsed = JSON.parse(plain)
    return parsed && typeof parsed === "object" ? parsed : null
  } catch {
    return null
  }
}

/**
 * What the UI is allowed to see: enough to recognise which token is stored,
 * never enough to use it. Short values are fully masked rather than
 * part-revealed — a 6-character secret with 4 characters shown is not a secret.
 */
export function maskSecret(value: string | null | undefined): string | null {
  if (!value) {
    return null
  }
  if (value.length <= 8) {
    return "•".repeat(value.length)
  }
  return `${value.slice(0, 3)}${"•".repeat(6)}${value.slice(-4)}`
}
