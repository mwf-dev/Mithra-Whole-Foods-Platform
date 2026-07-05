import { model } from "@medusajs/framework/utils"

export const HomepageSetting = model.define("homepage_setting", {
  id: model.id().primaryKey(),
  hero_title: model.text().default("From Local Farms\\nTo Your Family"),
  hero_subtitle: model.text().default("Traditional foods made with love, for a healthier and happier tomorrow."),
  hero_image_url: model.text().nullable(),
  promo_card_1_title: model.text().nullable(),
  promo_card_1_url: model.text().nullable(),
  promo_card_2_title: model.text().nullable(),
  promo_card_2_url: model.text().nullable(),
})
