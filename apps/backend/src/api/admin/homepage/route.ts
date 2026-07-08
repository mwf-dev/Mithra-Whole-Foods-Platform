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
  try {
    const homepageModuleService: HomepageService = req.scope.resolve(HOMEPAGE_MODULE)
    const settings = await homepageModuleService.listHomepageSettings()
    
    // ponytail: Explicit mapping strips injected ids/fields. 
    // Skipped: Zod validation schema. Add when strict type checking or length limits are needed.
    const payload: any = {
      hero_title: req.body.hero_title,
      hero_subtitle: req.body.hero_subtitle,
      hero_image_url: req.body.hero_image_url,
      promo_card_1_title: req.body.promo_card_1_title,
      promo_card_1_url: req.body.promo_card_1_url,
      promo_card_2_title: req.body.promo_card_2_title,
      promo_card_2_url: req.body.promo_card_2_url,
    }

    if (settings.length > 0) {
      const updated = await homepageModuleService.updateHomepageSettings({
        id: settings[0].id,
        ...payload
      })
      res.json({ homepage_setting: updated })
    } else {
      const created = await homepageModuleService.createHomepageSettings(payload)
      res.json({ homepage_setting: created })
    }
  } catch (e: any) {
    res.status(500).json({ error: e.message })
  }
}
