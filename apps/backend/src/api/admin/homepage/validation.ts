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
type ItemFieldKind = "text" | "url" | "date"
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
      title: { kind: "text", maxLength: 120 },
      subtitle: { kind: "text", maxLength: 200 },
      // Small pill above the title, e.g. "Free delivery", "Diwali".
      badge: { kind: "text", maxLength: 40 },
      // Discount code shown with a copy button. Must match a real Medusa
      // promotion — the storefront only displays it.
      code: { kind: "text", maxLength: 40 },
      cta: { kind: "text", maxLength: 40 },
      // Colour theme key (see OFFER_THEMES in the storefront's aisles.ts).
      theme: { kind: "text", maxLength: 20 },
      image_url: { kind: "url", maxLength: 2000 },
      link: { kind: "url", maxLength: 500 },
    },
  },
  welcome_cards: {
    maxItems: 10,
    itemFields: {
      badge: { kind: "text", maxLength: 40 },
      title: { kind: "text", maxLength: 80 },
      subtitle: { kind: "text", maxLength: 200 },
      cta: { kind: "text", maxLength: 40 },
      image_url: { kind: "url", maxLength: 2000 },
      link: { kind: "url", maxLength: 500 },
      // YYYY-MM-DD, inclusive. With neither set the card simply joins the
      // rotation; with a window it is shown first while today falls inside it.
      show_from: { kind: "date", maxLength: 10 },
      show_until: { kind: "date", maxLength: 10 },
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

export const isValidDateValue = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const d = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value
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
        if (rule.kind === "date" && !isValidDateValue(v)) {
          errors.push(`${field}[${idx}].${key} must be a date like 2026-10-31`)
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
