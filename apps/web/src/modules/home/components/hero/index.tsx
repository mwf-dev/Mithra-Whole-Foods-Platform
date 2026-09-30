import { HeroClient, HeroSlide } from "./client"
import { AISLES, HERO_AISLES, aisleHref } from "@modules/home/aisles"

/**
 * Homepage hero: one designed slide per featured aisle — the real pack on its
 * own colour world. Slides come from `HERO_AISLES` in `aisles.ts`; the admin
 * photo banners (`hero_banners`) are no longer shown here.
 */
export function Hero() {
  const slides: HeroSlide[] = HERO_AISLES.map((id) => AISLES.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => !!a?.hero)
    .map((a) => ({
      id: a.id,
      href: aisleHref(a),
      world: a.world,
      ...a.hero!,
    }))

  return <HeroClient slides={slides} />
}
