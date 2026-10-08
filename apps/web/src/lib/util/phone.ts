/**
 * Normalise a typed phone number. US numbers (10 digits, or 11 with a leading
 * 1) become E.164 (+1XXXXXXXXXX); an explicit +country number keeps its digits.
 * Returns null when it can't be a phone number.
 */
export function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "")
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`
  if (raw.trim().startsWith("+") && digits.length >= 8 && digits.length <= 15) {
    return `+${digits}`
  }
  return null
}
