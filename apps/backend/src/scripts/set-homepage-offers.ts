import { ExecArgs } from "@medusajs/framework/types"
import { HOMEPAGE_MODULE } from "../modules/homepage"
import HomepageService from "../modules/homepage/service"
import { validateBody } from "../api/admin/homepage/validation"

/**
 * One-off: replaces the homepage offer cards with the launch set. Touches
 * `offer_cards` only — every other homepage field is left as it is.
 *
 *   cd apps/backend && NODE_ENV=development npx medusa exec ./src/scripts/set-homepage-offers.ts
 *
 * (NODE_ENV=development keeps the Redis modules off — `medusa exec` otherwise
 * boots in production mode and needs a reachable REDIS_URL.)
 *
 * Every line is a fact from the catalog or the packs (prices as of
 * 2026-09-30). No discount codes: none exist as Medusa promotions yet, and a
 * code the checkout rejects is worse than no code. Afterwards the cards are
 * edited in admin → Homepage → Offers like any others.
 */
const OFFERS = [
  {
    badge: "Free delivery",
    title: "Free delivery on orders over $49",
    subtitle: "Delivered anywhere in the US. Cash on delivery available.",
    cta: "Start shopping",
    link: "/store",
    theme: "mithra",
  },
  {
    badge: "3 sizes",
    title: "Sastra Pure Cow Ghee from $1.99",
    subtitle: "100 ml jar, 1 L tin, or the 16 L tub for big kitchens.",
    cta: "Shop ghee",
    link: "/categories/ghee",
    theme: "ghee",
  },
  {
    badge: "Diwali",
    title: "Palm-jaggery sweets for the festival",
    subtitle: "Jangiri, Mysore pak and halwa, from $5.39.",
    cta: "Shop sweets",
    link: "/categories/sweets",
    theme: "festival",
  },
  {
    badge: "Wood pressed",
    title: "Sesame oil in 2 L and 5 L",
    subtitle: "Cold pressed and unrefined. Stock up for the month.",
    cta: "Shop oils",
    link: "/categories/cold-pressed-oils",
    theme: "oils",
  },
]

export default async function setHomepageOffers({ container }: ExecArgs) {
  const logger = container.resolve("logger")
  const service: HomepageService = container.resolve(HOMEPAGE_MODULE)

  // Same validation the admin save goes through.
  const { payload, errors } = validateBody({ offer_cards: OFFERS })
  if (errors.length) {
    throw new Error(`Invalid offers: ${errors.join(", ")}`)
  }

  const [settings] = await service.listHomepageSettings(
    {},
    { order: { created_at: "ASC" }, take: 1 }
  )
  if (!settings) {
    throw new Error("No homepage settings row exists yet — save once in the admin first.")
  }

  logger.info(
    `[offers] replacing ${
      Array.isArray(settings.offer_cards) ? settings.offer_cards.length : 0
    } offer card(s) with ${OFFERS.length}`
  )
  await service.updateHomepageSettings({ id: settings.id, offer_cards: payload.offer_cards as any })
  logger.info("[offers] done — the storefront picks this up within 60s (or on the next admin save)")
}
