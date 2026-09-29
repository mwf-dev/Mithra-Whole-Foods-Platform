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
  // Thin bar above the header, e.g. "Free delivery above ₹499"
  announcement_text: model.text().nullable(),
  // Short tagline shown in the storefront footer
  footer_tagline: model.text().nullable(),
  // [{ title, subtitle, image_url, link }] — rotating hero banners.
  // When present these take precedence over the single hero_* fields.
  hero_banners: model.json().nullable(),
  // [{ title, image_url, link }] — small offer/deal cards row
  offer_cards: model.json().nullable(),
  // [{ name, image_url, link }] — category tiles with images
  category_tiles: model.json().nullable(),
})
