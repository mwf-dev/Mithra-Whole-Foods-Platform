// Whitelisted fields with max lengths. Titles/subtitles are rendered as text;
// URL fields must parse as http(s) URLs or root-relative upload paths.
export const TEXT_FIELDS: Record<string, number> = {
  hero_title: 300,
  hero_subtitle: 500,
  promo_card_1_title: 300,
  promo_card_2_title: 300,
  announcement_text: 300,
  footer_tagline: 300,
}

export const URL_FIELDS: Record<string, number> = {
  hero_image_url: 2000,
  promo_card_1_url: 2000,
  promo_card_2_url: 2000,
}

// JSON list fields: arrays of flat objects. Each entry whitelists its item
// keys ("text" = length-capped string, "url" = also validated as URL/path).
type ItemFieldKind = "text" | "url"
type ListSpec = {
  maxItems: number
  itemFields: Record<string, { kind: ItemFieldKind; maxLength: number }>
}

export const LIST_FIELDS: Record<string, ListSpec> = {
  hero_banners: {
    maxItems: 5,
    itemFields: {
      title: { kind: "text", maxLength: 300 },
      subtitle: { kind: "text", maxLength: 500 },
      image_url: { kind: "url", maxLength: 2000 },
      link: { kind: "url", maxLength: 500 },
    },
  },
  offer_cards: {
    maxItems: 8,
    itemFields: {
      title: { kind: "text", maxLength: 300 },
      image_url: { kind: "url", maxLength: 2000 },
      link: { kind: "url", maxLength: 500 },
    },
  },
  category_tiles: {
    maxItems: 12,
    itemFields: {
      name: { kind: "text", maxLength: 100 },
      image_url: { kind: "url", maxLength: 2000 },
      link: { kind: "url", maxLength: 500 },
    },
  },
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
  payload: Record<string, unknown>
  errors: string[]
} => {
  const payload: Record<string, unknown> = {}
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

  for (const [field, spec] of Object.entries(LIST_FIELDS)) {
    const value = body[field]
    if (value === undefined || value === null) {
      continue
    }
    if (!Array.isArray(value)) {
      errors.push(`${field} must be an array`)
      continue
    }
    if (value.length > spec.maxItems) {
      errors.push(`${field} must have at most ${spec.maxItems} items`)
      continue
    }

    const cleanItems: Record<string, string>[] = []
    let itemError = false
    for (const [idx, item] of value.entries()) {
      if (typeof item !== "object" || item === null || Array.isArray(item)) {
        errors.push(`${field}[${idx}] must be an object`)
        itemError = true
        break
      }
      const clean: Record<string, string> = {}
      for (const [key, rule] of Object.entries(spec.itemFields)) {
        const v = (item as Record<string, unknown>)[key]
        if (v === undefined || v === null || v === "") {
          continue
        }
        if (typeof v !== "string") {
          errors.push(`${field}[${idx}].${key} must be a string`)
          itemError = true
          break
        }
        if (v.length > rule.maxLength) {
          errors.push(
            `${field}[${idx}].${key} must be at most ${rule.maxLength} characters`
          )
          itemError = true
          break
        }
        if (rule.kind === "url" && !isValidUrlValue(v)) {
          errors.push(
            `${field}[${idx}].${key} must be an http(s) URL or a relative path`
          )
          itemError = true
          break
        }
        clean[key] = v
      }
      if (itemError) {
        break
      }
      // Drop items that ended up completely empty
      if (Object.keys(clean).length > 0) {
        cleanItems.push(clean)
      }
    }

    if (!itemError) {
      payload[field] = cleanItems
    }
  }

  return { payload, errors }
}
