/**
 * Phone helpers shared by guest order lookup. The storefront stores the
 * shipping phone as typed-or-normalised, so comparison is on the national
 * number (last 10 digits) rather than on formatting.
 */
export const phoneDigits = (raw: unknown): string =>
  String(raw ?? "").replace(/\D/g, "")

/** True when both numbers are US-length or longer and share their last 10 digits. */
export function samePhone(a: unknown, b: unknown): boolean {
  const x = phoneDigits(a)
  const y = phoneDigits(b)
  if (x.length < 10 || y.length < 10) return false
  return x.slice(-10) === y.slice(-10)
}
