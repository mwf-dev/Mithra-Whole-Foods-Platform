import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HOMEPAGE_MODULE } from "../../../modules/homepage"
import HomepageService from "../../../modules/homepage/service"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const homepageModuleService: HomepageService = req.scope.resolve(HOMEPAGE_MODULE)
  const settings = await homepageModuleService.listHomepageSettings(
    {},
    { order: { created_at: "ASC" } }
  )

  res.json({
    homepage_settings: settings.length > 0 ? settings[0] : null,
  })
}

// Whitelisted fields with max lengths. Titles/subtitles are rendered as text;
// URL fields must parse as http(s) URLs or root-relative upload paths.
const TEXT_FIELDS: Record<string, number> = {
  hero_title: 300,
  hero_subtitle: 500,
  promo_card_1_title: 300,
  promo_card_2_title: 300,
}
const URL_FIELDS: Record<string, number> = {
  hero_image_url: 2000,
  promo_card_1_url: 2000,
  promo_card_2_url: 2000,
}

const isValidUrlValue = (value: string): boolean => {
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

const validateBody = (body: Record<string, unknown>): {
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

const triggerStorefrontRevalidation = async (): Promise<void> => {
  const storefrontUrl = process.env.STOREFRONT_URL
  const secret = process.env.REVALIDATE_SECRET

  if (!storefrontUrl || !secret) {
    console.warn(
      "[homepage] STOREFRONT_URL / REVALIDATE_SECRET not set — skipping storefront cache revalidation"
    )
    return
  }

  try {
    const res = await fetch(`${storefrontUrl.replace(/\/$/, "")}/api/revalidate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-revalidate-secret": secret,
      },
      body: JSON.stringify({ path: "/", type: "layout" }),
    })
    if (!res.ok) {
      console.warn(`[homepage] storefront revalidation failed: ${res.status}`)
    }
  } catch (e) {
    console.warn("[homepage] storefront revalidation request failed", e)
  }
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    const homepageModuleService: HomepageService = req.scope.resolve(HOMEPAGE_MODULE)

    const { payload, errors } = validateBody(
      (req.body ?? {}) as Record<string, unknown>
    )
    if (errors.length > 0) {
      res.status(400).json({ message: "Invalid homepage settings", errors })
      return
    }

    // Singleton discipline: always target the oldest row (same ordering as
    // GET) and self-heal any duplicates a historical race may have created.
    const settings = await homepageModuleService.listHomepageSettings(
      {},
      { order: { created_at: "ASC" } }
    )

    let result
    if (settings.length > 0) {
      if (settings.length > 1) {
        await homepageModuleService.deleteHomepageSettings(
          settings.slice(1).map((s) => s.id)
        )
      }
      result = await homepageModuleService.updateHomepageSettings({
        id: settings[0].id,
        ...payload,
      })
    } else {
      result = await homepageModuleService.createHomepageSettings(payload)
    }

    // Invalidate the storefront's cached homepage so edits appear immediately.
    // Failures are logged but never fail the save.
    await triggerStorefrontRevalidation()

    res.json({ homepage_settings: result })
  } catch (e: any) {
    console.error("[homepage] failed to save settings", e)
    res.status(500).json({ message: "Failed to save homepage settings" })
  }
}
