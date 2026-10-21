import type { ProductStory, StoryMap } from "./stories/types"
import { OILS } from "./stories/oils"
import { GHEE } from "./stories/ghee"
import { MILLETS } from "./stories/millets"
import { MIXES } from "./stories/mixes"
import { RICE } from "./stories/rice"
import { PANTRY } from "./stories/pantry"
import { SWEETS } from "./stories/sweets"
import { SNACKS } from "./stories/snacks"

export type { ProductStory, StoryPoint, StoryPointIcon } from "./stories/types"

/**
 * Handle → story. Copy for the Rajabogam Ponni rice is the client's own; the
 * rest was written from the product data plus public references on each
 * food's tradition and cooking, and is meant for the client to review.
 */
export const STORIES: StoryMap = {
  ...OILS,
  ...GHEE,
  ...MILLETS,
  ...MIXES,
  ...RICE,
  ...PANTRY,
  ...SWEETS,
  ...SNACKS,
}

export function storyForProduct(handle?: string | null): ProductStory | null {
  return (handle && STORIES[handle]) || null
}
