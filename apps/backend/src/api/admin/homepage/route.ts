import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { HOMEPAGE_MODULE } from "../../../modules/homepage"
import HomepageService from "../../../modules/homepage/service"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const homepageModuleService: HomepageService = req.scope.resolve(HOMEPAGE_MODULE)
  const settings = await homepageModuleService.listHomepageSettings()
  
  res.json({
    homepage_settings: settings.length > 0 ? settings[0] : null,
  })
}

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const homepageModuleService: HomepageService = req.scope.resolve(HOMEPAGE_MODULE)
  const settings = await homepageModuleService.listHomepageSettings()
  
  if (settings.length > 0) {
    const updated = await homepageModuleService.updateHomepageSettings(settings[0].id, req.body as any)
    res.json({ homepage_setting: updated })
  } else {
    const created = await homepageModuleService.createHomepageSettings(req.body as any)
    res.json({ homepage_setting: created })
  }
}
