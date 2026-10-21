/**
 * Long-form "about this product" content. One ProductStory per product handle,
 * shown in a full-width section under the buy box (see components/product-story).
 *
 * Writing rules (a test in product-stories.test.ts enforces the claim words):
 * - Culinary, heritage and how-to facts only. No disease, treatment or
 *   "boosts/prevents" claims, and no numbers a label would have to back up.
 * - Say "traditionally" or "commonly" for folk practice; keep it hedged where
 *   sources disagree.
 * - Only describe Mithra's own sourcing or process where the client has said it.
 */

export type StoryPointIcon =
  | "sprout"
  | "hourglass"
  | "calendar"
  | "award"
  | "scale"
  | "flame"
  | "meal"
  | "wheat"
  | "droplets"
  | "leaf"
  | "soup"
  | "cookie"
  | "coffee"
  | "package"
  | "sun"
  | "chef"
  | "pin"
  | "hammer"
  | "timer"
  | "gift"
  | "layers"
  | "nut"
  | "home"

export type StoryPoint = { icon: StoryPointIcon; title: string; text: string }

export type ProductStory = {
  eyebrow: string
  headline: string
  intro: string[]
  /** 2–4 short chips shown in the buy box column ("Net 2 lb · Unpolished"). */
  facts?: string[]
  /** Defaults to "What makes it special". */
  pointsHeading?: string
  points: StoryPoint[]
  /** "How to enjoy" ideas, rendered as a checklist card. */
  uses?: { heading: string; items: string[] }
  /** Storage / cooking note, rendered beside the uses card. */
  note?: { title: string; text: string }
  closingHeading?: string
  closing?: string
  signoff?: string
}

export type StoryMap = Record<string, ProductStory>
