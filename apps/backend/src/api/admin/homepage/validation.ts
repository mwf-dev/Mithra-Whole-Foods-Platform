// Whitelisted fields with max lengths. Titles/subtitles are rendered as text;
// URL fields must parse as http(s) URLs or root-relative upload paths.
export const TEXT_FIELDS: Record<string, number> = {
  hero_title: 300,
  hero_subtitle: 500,
  promo_card_1_title: 300,
  promo_card_2_title: 300,
}

export const URL_FIELDS: Record<string, number> = {
  hero_image_url: 2000,
  promo_card_1_url: 2000,
  promo_card_2_url: 2000,
}

export const isValidUrlValue = (value: string): boolean => {
  if (value === "") {
    return true
  }
  if (value.startsWith("/")) {
    return true // relative upload path served by the backend
  }
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

export const validateBody = (
  body: Record<string, unknown>
): {
  payload: Record<string, string>
  errors: string[]
} => {
  const payload: Record<string, string> = {}
  const errors: string[] = []

  for (const [field, maxLen] of Object.entries({ ...TEXT_FIELDS, ...URL_FIELDS })) {
    const value = body[field]
    if (value === undefined || value === null) {
      continue
    }
    if (typeof value !== "string") {
      errors.push(`${field} must be a string`)
      continue
    }
    if (value.length > maxLen) {
      errors.push(`${field} must be at most ${maxLen} characters`)
      continue
    }
    if (field in URL_FIELDS && !isValidUrlValue(value)) {
      errors.push(`${field} must be an http(s) URL or a relative /uploads path`)
      continue
    }
    payload[field] = value
  }

  return { payload, errors }
}
