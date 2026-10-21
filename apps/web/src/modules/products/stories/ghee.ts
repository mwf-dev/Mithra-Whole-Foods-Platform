import type { ProductStory, StoryMap } from "./types"

/** Same ghee in three sizes: shared copy, size-specific chips and note. */
const base = (
  size: string,
  headline: string,
  extra: Pick<ProductStory, "facts" | "note">
): ProductStory => ({
  eyebrow: `Sastra Pure Cow Ghee · ${size}`,
  headline,
  intro: [
    "Ghee is clarified butter: butter simmered gently until the water cooks off and the milk solids are strained away, leaving pure golden fat with a nutty, caramel aroma.",
    "Sastra Pure Cow Ghee is 100% pure cow ghee, crafted using traditional methods.",
  ],
  points: [
    { icon: "droplets", title: "100% pure cow ghee", text: "Clarified butter from cow's milk: nothing else added." },
    { icon: "flame", title: "High smoke point", text: "Ghee tolerates high heat (around 450°F / 230°C), so it suits frying, sautéing and tempering." },
    { icon: "chef", title: "Aroma that finishes a dish", text: "A spoonful melting over hot rice, dal or dosa is one of the simplest pleasures of Indian cooking." },
    { icon: "cookie", title: "The sweet-maker's fat", text: "Laddu, halwa, mysore pak and pongal all depend on a good ghee." },
  ],
  uses: {
    heading: "Ways to enjoy it",
    items: [
      "Over hot rice with dal or sambar, and a pinch of salt",
      "Ven pongal, dosa, parathas and rotis",
      "Frying cashews and raisins for payasam and kesari",
      "Festive sweets: laddu, halwa, mysore pak",
    ],
  },
  ...extra,
})

export const GHEE: StoryMap = {
  "sastra-pure-cow-ghee-100ml-3-2-oz": base(
    "100 ml (3.2 oz)",
    "A little jar of pure cow ghee.",
    {
      facts: ["Net 100 ml", "100% pure cow ghee", "High smoke point"],
      note: {
        title: "Good to know",
        text: "A small jar for trying it out, gifting or a single-person kitchen. Use a clean, dry spoon each time and keep it covered; ghee stays best away from moisture and direct sun.",
      },
    }
  ),
  "sastra-pure-cow-ghee-1l-32-oz": base(
    "1 L (32 oz)",
    "The family tin of pure cow ghee.",
    {
      facts: ["Net 1 L (910 g)", "100% pure cow ghee", "High smoke point"],
      note: {
        title: "Storage",
        text: "Keep the tin closed, in a cool, dry cupboard. Always use a clean, dry spoon; ghee needs no refrigeration, and it may be grainy or soft depending on the temperature.",
      },
    }
  ),
  "sastra-pure-cow-ghee-16l": base(
    "16 L",
    "Ghee by the tub for big kitchens.",
    {
      facts: ["Net 16 L", "100% pure cow ghee", "Bulk tub"],
      note: {
        title: "For large kitchens",
        text: "The 16 L tub is meant for caterers, temples, restaurants and big families. Decant into smaller containers for daily use, and keep the tub sealed in a cool, dry place.",
      },
    }
  ),
}
