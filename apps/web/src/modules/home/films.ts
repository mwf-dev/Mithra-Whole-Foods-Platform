/**
 * Short brand films. Each one is a single muted, looping MP4 (no audio track —
 * it autoplays in view), in two sizes so phones never download the 720p cut.
 *
 * `chapters` are start times in the *edited* film; the story section lights
 * up the matching step as the video plays.
 *
 * Sesame "seed to bottle" (8.8 s) was cut on 2026-09-30 from the client's two
 * AI renders: seeds, wooden press and the spout pour come from `mp4.mp4`;
 * cloth filter, bottle filling and the closing bottle come from
 * `Create_a_second_premium_cin.mp4`. The white-bottle and bottle-in-the-pan
 * shots were dropped. Re-cut with ffmpeg trim + xfade (0.35 s crossfades).
 */

export type Film = {
  id: string
  src: { hd: string; sd: string }
  poster: string
  /** Ground, accent and glow for the story section — sampled from the film. */
  palette: { ground: string; accent: string; glow: string }
  /** Describes the film for people who can't see it. */
  label: string
  chapters: { label: string; start: number }[]
  /** Product handles whose PDP shows this film. */
  productHandles: string[]
}

export const SESAME_FILM: Film = {
  id: "sesame-seed-to-bottle",
  src: {
    hd: "/films/sesame-seed-to-bottle-720.mp4",
    sd: "/films/sesame-seed-to-bottle-480.mp4",
  },
  poster: "/films/sesame-seed-to-bottle-poster.webp",
  palette: { ground: "#0E2A26", accent: "#F2C46B", glow: "#C98A1B" },
  label:
    "Sesame seeds fall onto a wooden table, are crushed in a wooden chekku press, golden oil runs from the spout, is filtered through cloth, and is bottled in a Mithra sesame oil bottle.",
  chapters: [
    { label: "Sesame seeds", start: 0 },
    { label: "Wooden chekku", start: 1.1 },
    { label: "Cold pressed", start: 2.6 },
    { label: "Filtered", start: 4.15 },
    { label: "Bottled unrefined", start: 5.2 },
  ],
  productHandles: ["extra-virgin-sesame-oil-2l", "extra-virgin-sesame-oil-5l"],
}

export const FILMS = [SESAME_FILM]

export function filmForProduct(handle?: string | null): Film | undefined {
  return handle ? FILMS.find((f) => f.productHandles.includes(handle)) : undefined
}
