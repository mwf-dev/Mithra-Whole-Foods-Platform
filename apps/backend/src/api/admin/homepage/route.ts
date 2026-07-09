import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HOMEPAGE_MODULE } from "../../../modules/homepage"
import HomepageService from "../../../modules/homepage/service"
import { validateBody } from "./validation"
import { revalidateStorefront } from "../../../utils/revalidate-storefront"

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
    await revalidateStorefront("/", "layout")

    res.json({ homepage_settings: result })
  } catch (e: any) {
    console.error("[homepage] failed to save settings", e)
    res.status(500).json({ message: "Failed to save homepage settings" })
  }
}
