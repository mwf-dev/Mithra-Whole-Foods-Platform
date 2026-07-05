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
