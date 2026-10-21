import type { StoryMap } from "./types"

const STORAGE = {
  title: "Keep it crisp",
  text: "Close the pouch tightly after opening, or move the snack to an airtight tin. Humidity is the enemy of crunch.",
}

export const SNACKS: StoryMap = {
  "mithra-kai-muruku-200g": {
    eyebrow: "Mithra Kai Muruku · 200 g",
    headline: "Kai muruku: the classic hand-twisted spiral.",
    intro: [
      "Kai murukku, 'hand murukku', is the classic South Indian snack: a dough of rice flour and urad dal flour, pressed or twisted by hand into spirals and fried until crisp. It is the star of Deepavali and Krishna Jayanthi plates.",
      "Mithra Kai Muruku is the classic hand-twisted murukku, in a 200 g pack.",
    ],
    facts: ["Net 200 g (7.05 oz)", "Hand-twisted", "Crisp and crunchy"],
    points: [
      { icon: "hammer", title: "Hand-twisted", text: "Shaped by hand into the classic spiral." },
      { icon: "flame", title: "Fried till crisp", text: "A satisfying crunch with every bite." },
      { icon: "award", title: "A festival favourite", text: "Made at Deepavali, Krishna Jayanthi and weddings." },
      { icon: "gift", title: "Easy to share", text: "A snack for gatherings and tea-time." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "With evening tea or filter coffee",
        "Part of a Deepavali snack plate",
        "Packed in the lunchbox or travel bag",
        "Crushed over curd rice for crunch",
      ],
    },
    note: STORAGE,
  },

  "mithra-manaparai-muruku-200g": {
    eyebrow: "Mithra Manaparai Muruku · 200 g",
    headline: "Manapparai murukku, a Tamil Nadu town's famous snack.",
    intro: [
      "Manapparai is a small town about 38 km from Tiruchirappalli, famous for a crisp rice murukku. Hundreds of local families still make it, and it is known for staying crunchy for a long time.",
      "Mithra Manaparai Muruku brings that famous crunch in a 200 g pack.",
    ],
    facts: ["Net 200 g (7.05 oz)", "Manapparai style", "Rice-based"],
    points: [
      { icon: "pin", title: "From Manapparai", text: "A town near Tiruchirappalli, known for its murukku." },
      { icon: "wheat", title: "Rice-based", text: "Classically made with rice flour, cumin, sesame and ajwain." },
      { icon: "flame", title: "Fried to a long-lasting crunch", text: "Some recipes call for frying twice to keep it crisp." },
      { icon: "gift", title: "A travellers' favourite", text: "A popular snack to carry home from Tamil Nadu." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "With tea or coffee in the evening",
        "Part of a festival snack platter",
        "Packed for road trips and picnics",
        "Crumbled over salads and curd rice",
      ],
    },
    note: STORAGE,
  },

  "mithra-mixture-200g": {
    eyebrow: "Mithra Mixture · 200 g",
    headline: "Mixture: a handful of everything crunchy.",
    intro: [
      "Mixture is a traditional South Indian savoury blend, typically crisp gram-flour noodles and pearls, peanuts and curry leaves tossed in spices. Every handful has a different texture.",
      "A tea-time staple and a staple of festival snack boxes.",
    ],
    facts: ["Net 200 g (7.05 oz)", "Savoury blend", "Crunchy mix"],
    points: [
      { icon: "layers", title: "Many textures in one", text: "A mix of crisp strands, pearls and nuts." },
      { icon: "flame", title: "Savoury and spiced", text: "Seasoned with chilli, salt and curry leaf." },
      { icon: "gift", title: "Tea-time staple", text: "Goes with chai, filter coffee and conversation." },
      { icon: "award", title: "A classic", text: "A fixture of Deepavali snack boxes." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "With tea or coffee",
        "Sprinkled on curd rice or salad for crunch",
        "Tossed with chopped onion, tomato and lime for chaat",
        "Packed in snack boxes and travel bags",
      ],
    },
    note: STORAGE,
  },

  "mithra-kara-boondi-200g": {
    eyebrow: "Mithra Kara Boondi · 200 g",
    headline: "Kara boondi: spiced gram-flour pearls.",
    intro: [
      "Kara boondi is made by dropping a gram-flour batter through a slotted ladle into hot oil, producing tiny, crisp pearls that are tossed with chilli, salt and curry leaves.",
      "Crisp and spiced, it is a pocketful of crunch.",
    ],
    facts: ["Net 200 g (7.05 oz)", "Gram-flour pearls", "Spiced"],
    points: [
      { icon: "wheat", title: "Gram-flour pearls", text: "Tiny, round and crisp." },
      { icon: "flame", title: "Spiced", text: "Seasoned with chilli, salt and curry leaf." },
      { icon: "gift", title: "Bite-sized snacking", text: "Easy to eat by the handful with tea." },
      { icon: "chef", title: "A garnish too", text: "Adds crunch to curd rice, chaat and salads." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "With tea or coffee",
        "Sprinkled over curd rice for crunch",
        "In chaat with onion, tomato and lime",
        "Mixed into homemade mixture",
      ],
    },
    note: STORAGE,
  },

  "mithra-pepper-kara-sev-200g": {
    eyebrow: "Mithra Pepper Kara Sev · 200 g",
    headline: "Pepper kara sev: crunchy, peppery strands.",
    intro: [
      "Sev is a crisp snack of thin gram-flour strands, pressed into hot oil and fried until golden. In this version, kara sev is spiked with black pepper for a warm, peppery bite.",
      "Crunchy and peppery, it is a classic with tea.",
    ],
    facts: ["Net 200 g (7.05 oz)", "Crunchy sev", "Peppery"],
    points: [
      { icon: "wheat", title: "Thin crisp strands", text: "Gram-flour dough pressed into fine strands." },
      { icon: "flame", title: "Pepper kick", text: "Black pepper gives a warm, lingering heat." },
      { icon: "gift", title: "Tea-time snack", text: "Light, crunchy and addictive." },
      { icon: "chef", title: "A chaat topping", text: "Crush over bhel, sev puri and curd rice." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "With chai or filter coffee",
        "Crushed over curd rice or salad",
        "On top of chaat, bhel and sev puri",
        "Mixed into snack boxes",
      ],
    },
    note: STORAGE,
  },
}
