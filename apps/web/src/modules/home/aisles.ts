import type { HttpTypes } from "@medusajs/types"

/**
 * Shopper-facing "aisles" for the homepage.
 *
 * The back office has 17 product categories, several with a single product.
 * Shoppers see 11 aisles instead, each grouping one or more real categories
 * (matched by handle, so product counts and links always come from the
 * backend). What lives here is *presentation* only: the aisle's colour world,
 * its pack art, and the copy for its hero slide / spotlight band.
 *
 * Colour worlds are sampled from each aisle's hero pack (the client's own
 * artwork). They are content, not UI tokens — they only ever paint an aisle's
 * own surfaces (disc, hero slide, spotlight band). Buttons, cards, header and
 * checkout stay on the tailwind tokens.
 *
 * Copy rule: every claim below is printed on the physical pack. Do not add
 * claims that are not — especially health/condition claims (US FDA rules are
 * stricter than the Indian labels these packs were designed for).
 */

export type AisleWorld = {
  /** Ground colour of the aisle's surfaces. */
  bg: string
  /** Text/ink on that ground. */
  ink: string
  /** Secondary surface (chips, sibling tiles, CTA fill). */
  deep: string
}

export type AisleArt = {
  src: string
  alt: string
  /** `cutout` = transparent pack that can break out of its frame; `label` = flat print artwork. */
  kind: "cutout" | "label"
}

export type ComingSoonItem = { name: string; image: string }

export type Aisle = {
  id: string
  name: string
  /** Backend category handles this aisle groups. First one is the link target. */
  categoryHandles: string[]
  world: AisleWorld
  art?: AisleArt
  hero?: {
    kicker: string
    headline: string
    chips: string[]
    cta: string
    image: string
    imageAlt: string
    /** Set while the aisle's hero products are not purchasable yet. */
    launching?: boolean
    /** Full-bleed 3:2 hero scene (see HeroSlide.scene). Optional: without it the slide uses `image`. */
    scene?: string
    /** Round sticker over the scene ("New", "Launching soon"). */
    badge?: string
  }
  spotlight?: {
    eyebrow: string
    headline: string
    points: string[]
    image: string
    imageAlt: string
    /**
     * CSS object-position for the scene. Mockups show front, side and back of
     * a pack in a row; a centred crop lands on the nutrition panel.
     */
    imagePosition?: string
    /** Shown instead of live products while they are not in the catalog yet. */
    comingSoon?: ComingSoonItem[]
  }
}

const P = "/packs"

export const AISLES: Aisle[] = [
  {
    id: "ghee",
    name: "Ghee",
    categoryHandles: ["ghee"],
    world: { bg: "#F3D310", ink: "#1B4D25", deep: "#1B4D25" },
    art: { src: `${P}/ghee-16l.webp`, alt: "Sastra Pure Cow Ghee 16 L tub", kind: "cutout" },
    hero: {
      kicker: "Sastra Pure Cow Ghee",
      headline: "Clarified butter, from 100 ml to 16 L",
      chips: ["Lactose free", "Gluten free", "High smoke point"],
      cta: "Shop ghee",
      image: `${P}/ghee-100ml-trio.webp`,
      imageAlt: "Sastra Pure Cow Ghee jar, tin and tub with ven pongal, laddoos and marigolds",
      scene: "/hero/ghee.webp",
    },
    spotlight: {
      eyebrow: "Aisle · Ghee",
      headline: "One ghee, three sizes for every kitchen",
      points: [
        "Pure cow ghee (clarified butter)",
        "Lactose free and gluten free",
        "100 ml jar, 1 L tin, or the 16 L tub for big kitchens",
      ],
      image: "/scenes/ghee-kitchen.webp",
      imageAlt: "Sastra ghee jar, tin and tub on a kitchen counter beside a plate of dosas",
    },
  },
  {
    id: "podis",
    name: "Podis & spices",
    categoryHandles: ["spices"],
    world: { bg: "#D66A1F", ink: "#FFF6EC", deep: "#77481B" },
    art: { src: `${P}/idli-podi.webp`, alt: "Mithra Idli Podi jar", kind: "cutout" },
    hero: {
      kicker: "Traditional South Indian podi",
      headline: "Freshly roasted. Idli, paruppu, sesame.",
      chips: ["No artificial colours", "No preservatives"],
      cta: "See the podis",
      image: `${P}/idli-podi-trio.webp`,
      imageAlt: "Three jars of Mithra Idli Podi",
      scene: "/hero/podis.webp",
      launching: true,
    },
    spotlight: {
      eyebrow: "Aisle · Podis & spices",
      headline: "The podi shelf your idli has been missing",
      points: [
        "Freshly roasted, South Indian style",
        "No artificial colours, no preservatives",
        "200 g jars: Idli, Paruppu and Sesame",
      ],
      image: "/scenes/podi-shelf.webp",
      imageAlt: "Mithra Idli, Paruppu and Sesame podi jars on a pantry shelf with idlis",
      comingSoon: [
        { name: "Idli Podi", image: `${P}/idli-podi.webp` },
        { name: "Paruppu Podi", image: `${P}/paruppu-podi.webp` },
        { name: "Sesame Podi", image: `${P}/sesame-podi.webp` },
      ],
    },
  },
  {
    id: "kids-flours",
    name: "Kids' flours",
    categoryHandles: ["millet-flours"],
    world: { bg: "#7F1439", ink: "#FBE4EA", deep: "#4C1120" },
    art: { src: `${P}/popped-ragi.webp`, alt: "Popped Ragi Flour pouch", kind: "cutout" },
    hero: {
      kicker: "New · Popped Ragi Flour",
      headline: "Enriched with dates, almonds & cashews",
      chips: ["No added sugar", "No preservatives"],
      cta: "See kids' flours",
      image: `${P}/popped-ragi-pair.webp`,
      imageAlt: "Popped Ragi Flour pouches, back and front",
      scene: "/hero/ragi.webp",
      badge: "New",
      launching: true,
    },
  },
  {
    id: "health-mixes",
    name: "Health mixes",
    categoryHandles: ["health-drink-mix", "herbs"],
    world: { bg: "#E3D7BF", ink: "#3E2E1A", deep: "#785B38" },
    art: { src: `${P}/multigrain.webp`, alt: "Multigrain Health Mix pouch", kind: "cutout" },
    spotlight: {
      eyebrow: "Aisle · Health mixes",
      headline: "Porridge and malt mixes for slow mornings",
      points: [
        "Millet and traditional-rice porridge mixes",
        "Beetroot and carrot malts",
        "Sukku coffee, the dry-ginger classic",
      ],
      image: "/scenes/mixes-morning.webp",
      imageAlt: "Mithra Multi Grain Health Mix, Paruthi Paal Mix and Palmyra Sprouts Powder with porridge and a malt drink",
    },
  },
  {
    id: "rice",
    name: "Rice",
    categoryHandles: ["traditional-rice", "rices"],
    world: { bg: "#AB1316", ink: "#F6EFC9", deep: "#7C2119" },
    art: { src: `${P}/rice-rajabogam.webp`, alt: "Mithra Rajabogam Ponni boiled rice bag", kind: "cutout" },
  },
  {
    id: "oils",
    name: "Cold-pressed oils",
    categoryHandles: ["cold-pressed-oils"],
    world: { bg: "#1F5F5B", ink: "#F4EEDC", deep: "#123D3A" },
    art: { src: `${P}/sesame-oil-2l.webp`, alt: "Mithra cold-pressed sesame oil, 2 L bottle", kind: "cutout" },
    hero: {
      kicker: "Mithra wooden-press oils",
      headline: "Wood-pressed peanut and sesame oil",
      chips: ["Cold pressed", "Single filtered", "Unrefined"],
      cta: "Shop oils",
      image: `${P}/sesame-oil-duo.webp`,
      imageAlt: "Mithra wooden-press peanut oil and sesame oil jugs with peanuts, sesame seeds and a dosa",
      scene: "/hero/oils.webp",
    },
  },
  {
    id: "millets",
    name: "Millets",
    categoryHandles: ["millet-grains", "millet-noodles", "millet-vermicelli"],
    world: { bg: "#EFE2D2", ink: "#212D18", deep: "#212D18" },
    art: { src: `${P}/little-millet-pouch.webp`, alt: "Mithra Little Millet pouch with a bowl of millet", kind: "cutout" },
  },
  {
    id: "sweeteners",
    name: "Natural sweeteners",
    categoryHandles: ["natural-sweeteners"],
    world: { bg: "#F3EDD7", ink: "#644C35", deep: "#644C35" },
    art: { src: `${P}/palm-sugar.webp`, alt: "Palm sugar pouch", kind: "cutout" },
  },
  {
    id: "sweets-snacks",
    name: "Sweets & snacks",
    categoryHandles: ["sweets", "snacks", "millet-candy"],
    // Banana-leaf green: the sweets are photographed on leaf, and the palm
    // jaggery reads warm against it without the page turning brown.
    world: { bg: "#2F6A34", ink: "#FBF3DC", deep: "#1B4020" },
    art: { src: `${P}/jangiri-plate.webp`, alt: "Plate of palm-jaggery jangiri", kind: "cutout" },
    hero: {
      kicker: "Mithra sweets",
      headline: "Sweets from the old kitchen",
      chips: ["Kamarkat", "Elantha vadai", "Groundnut chikki"],
      cta: "Shop sweets",
      image: `${P}/kamarkat-plate.webp`,
      imageAlt: "Mithra Kamarkat, Elantha Vadai and Groundnut Chikki pouches with the sweets on a banana leaf",
      scene: "/hero/sweets.webp",
    },
  },
  {
    id: "treats",
    name: "Traditional treats",
    categoryHandles: ["traditional-treats"],
    world: { bg: "#E4E8F3", ink: "#21325E", deep: "#21325E" },
    art: { src: `${P}/kamarkat-plate.webp`, alt: "Brass plate of kamarkat", kind: "cutout" },
  },
  {
    id: "pantry",
    name: "Dals & pantry",
    categoryHandles: ["lentils-/-dals", "salt", "pickles"],
    world: { bg: "#F6D77A", ink: "#3A2A10", deep: "#8B5E3C" },
    art: { src: `${P}/toor-dal-bowl.webp`, alt: "Bowl of toor dal", kind: "cutout" },
  },
]

/** Aisles, in order, that get a hero slide. */
export const HERO_AISLES = ["ghee", "podis", "oils", "kids-flours", "sweets-snacks"]

/** Aisles, in order, that the homepage features as spotlight bands. */
export const SPOTLIGHT_AISLES = ["podis", "ghee", "health-mixes"]

/** Occasions for "Shop by moment". Deliberately occasions, never health conditions. */
export const MOMENTS: {
  title: string
  line: string
  href: string
  image: string
  kind?: "cutout" | "label"
  world: AisleWorld
  /** Optional CSS background that replaces the flat `world.bg`. */
  background?: string
}[] = [
  {
    title: "Breakfast",
    line: "Porridge mixes, malts and podi for idli",
    href: "/categories/health-drink-mix",
    image: `${P}/multigrain.webp`,
    world: { bg: "#E3D7BF", ink: "#3E2E1A", deep: "#785B38" },
  },
  {
    title: "Lunchbox",
    line: "Traditional rice and millets that cook like rice",
    href: "/categories/traditional-rice",
    image: `${P}/rice-rajabogam.webp`,
    world: { bg: "#AB1316", ink: "#F6EFC9", deep: "#7C2119" },
  },
  {
    title: "Festival sweets",
    line: "Palm-jaggery sweets, halwa and ghee",
    href: "/categories/sweets",
    image: `${P}/jangiri-plate.webp`,
    // Same night-to-lamplight palette as the Diwali banner.
    world: { bg: "#7A1D2E", ink: "#FCE9C8", deep: "#2A0C14" },
    background:
      "radial-gradient(120% 90% at 70% 110%, #E8A93A 0%, #7A1D2E 50%, #2A0C14 100%)",
  },
  {
    title: "Everyday cooking",
    line: "Cold-pressed oils, dals and sea salt",
    href: "/categories/cold-pressed-oils",
    image: `${P}/sesame-oil-2l.webp`,
    world: { bg: "#1F5F5B", ink: "#F4EEDC", deep: "#123D3A" },
  },
]

/** Seasonal poster slot. Hidden automatically after `until`. */
export const FESTIVAL = {
  until: "2026-11-09T23:59:59-05:00",
  eyebrow: "Diwali · 8 November",
  headline: "Pure ghee for every Diwali sweet",
  line: "Sastra Pure Cow Ghee and palm-jaggery sweets, shipped from Exton, PA.",
  cta: "Shop the Diwali pantry",
  href: "/categories/ghee",
  image: `${P}/ghee-100ml-trio.webp`,
  imageAlt: "Three jars of Sastra Pure Cow Ghee",
  /** Poster palette: night sky to lamp-light. Festival-only, like the aisle worlds. */
  colors: { night: "#2A0C14", dusk: "#7A1D2E", lamp: "#E8A93A", ink: "#FCE9C8", accent: "#F2C46B" },
}

/** Brand facts for the "Why Mithra" panels — all from the pack backs. */
export const WHY_MITHRA: {
  title: string
  body: string
  image: string
  bg: string
  fit?: "cover" | "contain"
}[] = [
  {
    title: "Roasted in Tamil Nadu",
    body: "Made by Sastra Foods in Tiruppur, then imported and distributed by Mithra from Exton, PA.",
    image: `${P}/podi-scene.webp`,
    bg: "#77481B",
  },
  {
    title: "Wooden-pressed oils",
    body: "Cold pressed, single filtered and unrefined, pressed the traditional chekku way.",
    image: `${P}/sesame-oil-5l.webp`,
    bg: "#1F5F5B",
    fit: "contain",
  },
  {
    title: "Nothing added",
    body: "No preservatives or artificial colours on the podis, flours and mixes. No added sugar on the kids' range.",
    image: `${P}/popped-ragi-pair.webp`,
    bg: "#7F1439",
    fit: "contain",
  },
  {
    title: "Shipped from Pennsylvania",
    body: "Stocked in Exton and shipped within the US, so there is no waiting on international shipping.",
    image: `${P}/ghee-scene.webp`,
    bg: "#1B4D25",
  },
]

/** Fixed trust points appended to the admin announcement in the ticker. */
export const TICKER_FACTS = [
  "Ships from Exton, PA",
  "Wooden-pressed oils",
  "Freshly roasted podis",
]

export function aisleHref(aisle: Aisle) {
  return aisle.categoryHandles[0]
    ? `/categories/${aisle.categoryHandles[0]}`
    : "/store"
}

/** Distinct products across an aisle's categories (a product can sit in two). */
export function aisleProductIds(
  aisle: Aisle,
  categories: HttpTypes.StoreProductCategory[]
): Set<string> {
  const ids = new Set<string>()
  for (const handle of aisle.categoryHandles) {
    const category = categories.find((c) => c.handle === handle)
    category?.products?.forEach((p) => ids.add(p.id))
  }
  return ids
}

/**
 * Colour themes an admin can pick for an offer card (Homepage → Offers). Keys
 * must match OFFER_THEME_OPTIONS in the backend admin page. `art` is used when
 * the card has no uploaded picture.
 */
export const OFFER_THEMES: Record<
  string,
  { world: AisleWorld; art: string; background?: string }
> = {
  ghee: { world: { bg: "#F3D310", ink: "#1B4D25", deep: "#1B4D25" }, art: `${P}/ghee-1l.webp` },
  podis: { world: { bg: "#D66A1F", ink: "#FFF6EC", deep: "#77481B" }, art: `${P}/idli-podi-trio.webp` },
  oils: { world: { bg: "#1F5F5B", ink: "#F4EEDC", deep: "#123D3A" }, art: `${P}/sesame-oil-duo.webp` },
  ragi: { world: { bg: "#7F1439", ink: "#FBE4EA", deep: "#4C1120" }, art: `${P}/popped-ragi-pair.webp` },
  sweets: { world: { bg: "#2F6A34", ink: "#FBF3DC", deep: "#1B4020" }, art: `${P}/karupatti-crate.webp` },
  rice: { world: { bg: "#AB1316", ink: "#F6EFC9", deep: "#7C2119" }, art: `${P}/rice-rajabogam.webp` },
  millets: { world: { bg: "#EFE2D2", ink: "#212D18", deep: "#212D18" }, art: `${P}/little-millet-pouch.webp` },
  health: { world: { bg: "#E3D7BF", ink: "#3E2E1A", deep: "#785B38" }, art: `${P}/multigrain.webp` },
  festival: {
    world: { bg: "#7A1D2E", ink: "#FCE9C8", deep: "#2A0C14" },
    art: `${P}/jangiri-plate.webp`,
    background: "radial-gradient(120% 90% at 75% 115%, #E8A93A 0%, #7A1D2E 50%, #2A0C14 100%)",
  },
  mithra: { world: { bg: "#1E5B22", ink: "#FAF7F1", deep: "#0F3A13" }, art: `${P}/ghee-16l.webp` },
}

/** Order used for cards that leave the theme on "Automatic". */
export const OFFER_THEME_CYCLE = ["ghee", "oils", "podis", "sweets", "ragi", "rice"]
