/**
 * Long-form "about this product" copy for the product page, keyed by product
 * handle. It shows in a full-width section below the buy box; the short
 * `description` Medusa field stays in the buy box. Copy is the client's own
 * (supplied 2026-10-21) — only formatting was tidied, wording is unchanged.
 */

export type StoryPointIcon =
  | "sprout"
  | "hourglass"
  | "calendar"
  | "award"
  | "scale"
  | "flame"
  | "meal"

export type ProductStory = {
  eyebrow: string
  headline: string
  intro: string[]
  pointsHeading: string
  points: { icon: StoryPointIcon; title: string; text: string }[]
  closingHeading: string
  closing: string
  signoff: string
}

const STORIES: Record<string, ProductStory> = {
  "mithra-rajabogam-ponni-boiled-rice": {
    eyebrow: "Mithra Rajabogam · Ponni Boiled Rice",
    headline: "The Richness of Tradition, The Goodness of Nature.",
    intro: [
      "Grown during Tamil Nadu's traditional Samba season, our Rajabogam Ponni Boiled Rice is cultivated with patience, care, and generations of farming knowledge.",
      "Our Ponni paddy is allowed to mature naturally for 150 days giving the grains sufficient time to develop before harvest.",
    ],
    pointsHeading: "What Makes Our Ponni Rice Special?",
    points: [
      {
        icon: "sprout",
        title: "Traditional Samba Season Cultivation",
        text: "Grown during the December–January harvest season, following the natural agricultural cycle.",
      },
      {
        icon: "hourglass",
        title: "150 Days of Natural Maturity",
        text: "Our paddy is allowed to complete its full 150-day growing cycle before harvest.",
      },
      {
        icon: "calendar",
        title: "One Crop a Year",
        text: "Cultivated once annually, respecting the seasonal rhythm of traditional farming.",
      },
      {
        icon: "award",
        title: "30+ Years of Farming Expertise",
        text: "Nurtured through decades of agricultural experience and cultivation practices.",
      },
      {
        icon: "scale",
        title: "Quality Over Quantity",
        text: "With a typical yield of approximately 20–25 bags per acre, our focus remains on grain quality rather than maximizing production.",
      },
      {
        icon: "flame",
        title: "Single Boiled",
        text: "Our harvested paddy undergoes a single parboiling process before milling. Its firm, non-sticky texture and rich mineral content make it the ideal choice.",
      },
      {
        icon: "meal",
        title: "Perfect for Everyday South Indian Meals",
        text: "A wonderful choice for traditional home-cooked meals, from sambar rice to rasam and curd rice.",
      },
    ],
    closingHeading: "From Our Fields to Your Family",
    closing:
      "At Mithra Whole Foods, we believe good food begins with good farming. Every grain of Rajabogam Ponni Rice reflects the patience of the farmer, the richness of our agricultural heritage, and our commitment to bringing thoughtfully sourced food to your table.",
    signoff: "Mithra Whole Foods — Food, the Way Nature Intended",
  },
}

export function storyForProduct(handle?: string | null): ProductStory | null {
  return (handle && STORIES[handle]) || null
}
