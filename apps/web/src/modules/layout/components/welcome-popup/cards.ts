import { cloudinaryUrl } from "@lib/util/cloudinary"
import { safeCssUrl } from "@lib/util/safe-css-url"
import { HomepageSettings, resolveBackendImage } from "@lib/data/homepage"
import { AISLES, AisleWorld, aisleHref } from "@modules/home/aisles"

/**
 * One card in the arrival popup. Plain data so it can cross from the server
 * layout to the client component.
 */
export type WelcomeCard = {
  id: string
  kind: "signup" | "product" | "custom"
  badge?: string
  title: string
  subtitle?: string
  /** Short claims shown as pills (product cards: the ones printed on the pack). */
  chips?: string[]
  cta: string
  /** Storefront path ("/categories/ghee") or an absolute URL. */
  href: string
  /** Pack image under /public (product cards). */
  image?: string
  /** Packs shown as a collage (sign-up card). */
  collage?: string[]
  /** Admin-uploaded picture, already resolved and CSS-safe. */
  imageUrl?: string
  world: AisleWorld
  /** YYYY-MM-DD, inclusive. A card with a window is featured while today is inside it. */
  showFrom?: string
  showUntil?: string
}

const P = "/packs"

const SIGNUP_CARD: WelcomeCard = {
  id: "signup",
  kind: "signup",
  badge: "Welcome",
  title: "Welcome to Mithra Whole Foods",
  subtitle:
    "Traditional foods from South India, packed in the US. Create an account and shopping gets quicker every time.",
  chips: [
    "Faster checkout",
    "Saved addresses",
    "Track your orders",
    "Cart follows you across devices",
  ],
  cta: "Create account",
  // The component adds ?redirect= for the page the visitor is on.
  href: "/account",
  collage: [`${P}/popped-ragi.webp`, `${P}/ghee-1l.webp`, `${P}/idli-podi.webp`],
  world: { bg: "#1B4D25", ink: "#FAF7F1", deep: "#0F3A13" },
}

/**
 * Built-in product cards, one per featured aisle. Copy comes straight from
 * the aisle's hero slide, so every claim is one printed on the pack.
 */
function productCards(): WelcomeCard[] {
  const cards: WelcomeCard[] = []
  for (const aisle of AISLES) {
    if (aisle.hero) {
      cards.push({
        id: `aisle-${aisle.id}`,
        kind: "product",
        badge: aisle.hero.launching ? "Launching soon" : aisle.name,
        title: aisle.hero.headline,
        subtitle: aisle.hero.kicker,
        chips: aisle.hero.chips,
        cta: aisle.hero.cta,
        href: aisleHref(aisle),
        image: aisle.hero.image,
        world: aisle.world,
      })
    } else if (aisle.spotlight && aisle.art) {
      cards.push({
        id: `aisle-${aisle.id}`,
        kind: "product",
        badge: aisle.name,
        title: aisle.spotlight.headline,
        subtitle: aisle.spotlight.points[0],
        cta: `Shop ${aisle.name.toLowerCase()}`,
        href: aisleHref(aisle),
        image: aisle.art.src,
        world: aisle.world,
      })
    }
  }
  return cards
}

const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v)

/** Cards the admin set up under Homepage → Welcome popup. */
function customCards(settings: HomepageSettings | null): WelcomeCard[] {
  return (settings?.welcome_cards ?? [])
    .filter((c) => c.title)
    .map((c, i) => ({
      id: `custom-${i}-${c.title}`,
      kind: "custom" as const,
      badge: c.badge,
      title: c.title as string,
      subtitle: c.subtitle,
      cta: c.cta || "Shop now",
      href: c.link || "/store",
      imageUrl: c.image_url
        ? safeCssUrl(cloudinaryUrl(resolveBackendImage(c.image_url), { width: 720 }))
        : undefined,
      world: { bg: "#1E5B22", ink: "#FAF7F1", deep: "#0F3A13" },
      showFrom: isDate(c.show_from) ? c.show_from : undefined,
      showUntil: isDate(c.show_until) ? c.show_until : undefined,
    }))
}

/** Everything the popup can rotate through. The sign-up card is for guests only. */
export function buildWelcomeCards(
  settings: HomepageSettings | null,
  isGuest: boolean
): WelcomeCard[] {
  return [
    ...(isGuest ? [SIGNUP_CARD] : []),
    ...customCards(settings),
    ...productCards(),
  ]
}
