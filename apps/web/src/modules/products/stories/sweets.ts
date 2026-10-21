import type { StoryMap } from "./types"

/** Same sweets, one carton: the palm-jaggery range shares its sourcing note. */
const PALM_NOTE = {
  icon: "leaf" as const,
  title: "No preservatives, no additives",
  text: "Made using native palm jaggery to retain the traditional taste, with no preservatives and no additives.",
}

export const SWEETS: StoryMap = {
  // ── Sweeteners ───────────────────────────────────────────────────────────
  "mithra-palm-jaggery-500g": {
    eyebrow: "Mithra Palm Jaggery · Panai Karupatti · 500 g",
    headline: "Karupatti: jaggery from the palmyra palm.",
    intro: [
      "Karupatti (panai karupatti) is jaggery made from palmyra sap. It is a dark, fragrant sweetener with a deep caramel taste, a favourite for Tamil sweets, payasam, kaapi and festival cooking.",
      "Mithra's palm jaggery is traditionally made from palmyra sap, 100% natural, with no preservatives.",
    ],
    facts: ["Net 500 g (17.64 oz)", "From palmyra sap", "No preservatives"],
    points: [
      { icon: "leaf", title: "From palmyra sap", text: "Tapped from the palm, then boiled down and set into jaggery." },
      { icon: "cookie", title: "Deep caramel flavour", text: "Richer and darker than cane jaggery." },
      { icon: "flame", title: "Traditional sweets", text: "Pongal, payasam, kozhukattai and sesame laddu." },
      { icon: "coffee", title: "Kaapi and kanji", text: "Dissolve it in coffee, sukku kaapi or porridge." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "Sweet pongal and payasam",
        "Sukku coffee and karupatti kaapi",
        "Kozhukattai filling with coconut",
        "Melted into syrup over dosa or pancakes",
      ],
    },
    note: {
      title: "Using it",
      text: "Grate or shave it, or melt in a little water and strain; palm jaggery can contain tiny bits of grit, so straining before use is a good habit.",
    },
  },

  "mithra-pure-solid-jaggery-500g": {
    eyebrow: "Mithra Pure Solid Jaggery · 500 g",
    headline: "Cane jaggery, the everyday sweetener of Indian kitchens.",
    intro: [
      "Jaggery (vellam) is made by boiling sugarcane juice until it thickens and sets. It keeps the molasses that refined sugar loses, giving a warm, mellow sweetness.",
      "Mithra Pure Solid Jaggery is made from sugarcane juice, with no preservatives, in a 500 g block.",
    ],
    facts: ["Net 500 g (17.64 oz)", "Sugarcane juice", "No preservatives"],
    points: [
      { icon: "leaf", title: "Sugarcane juice", text: "Boiled down and set, with no preservatives." },
      { icon: "cookie", title: "Mellow sweetness", text: "Deep, warm sweetness suits Indian sweets." },
      { icon: "chef", title: "An all-purpose sweetener", text: "Pongal, payasam, laddu, chikki and chai." },
      { icon: "package", title: "Solid block", text: "Chop, grate or melt as needed." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "Sweet pongal, payasam and kesari",
        "Laddu, chikki and jaggery sweets",
        "Jaggery tea and kaapi",
        "Jaggery syrup over pancakes and dosa",
      ],
    },
    note: {
      title: "Using it",
      text: "Melt in a little water and strain for syrup. Store the block in an airtight container in a cool, dry place.",
    },
  },

  "jaggery-powder-raw-cane-sugar-2lbs": {
    eyebrow: "Jaggery Powder · Raw Cane Sugar · 2 lb",
    headline: "Unrefined cane sugar in an easy-to-use powder.",
    intro: [
      "Jaggery powder is unrefined cane sugar made from dried whole sugarcane juice, ground fine. Because it is not cooked at high heat and the molasses is not separated from the sugar, it has a rich, caramel taste.",
      "It can be substituted 1:1 for refined sugar in most recipes.",
    ],
    facts: ["Net 2 lb", "Unrefined cane sugar", "1:1 sugar swap"],
    points: [
      { icon: "leaf", title: "Whole cane juice", text: "Dried whole sugarcane juice, ground fine." },
      { icon: "scale", title: "Easy 1:1 swap", text: "Use in place of refined sugar, spoon for spoon." },
      { icon: "cookie", title: "Caramel taste", text: "The molasses stays in, which gives a warm, deeper flavour." },
      { icon: "package", title: "2 lb pack", text: "A generous kitchen supply." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "Tea, coffee and milk",
        "Payasam, halwa and laddu",
        "Baking cookies, cakes and muffins",
        "Sweetening porridge and oatmeal",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container away from moisture; powders can clump in humid weather.",
    },
  },

  "palm-sugar-250g": {
    eyebrow: "Palm Sugar · 250 g",
    headline: "Palm sugar: handmade brown sugar with a caramel depth.",
    intro: [
      "Palm sugar is a rich, unrefined brown sugar with a deep caramel flavour. It is produced by tapping the sweet nectar of the palm flower and drying the juice in a large open kettle.",
      "The juice condenses into a handmade whole brown sugar. No chemicals, bone char or animal by-products are used, so it is vegan too.",
    ],
    facts: ["Net 250 g", "Unrefined", "Vegan"],
    points: [
      { icon: "leaf", title: "Tapped from the palm", text: "The nectar of the palm flower, dried in an open kettle." },
      { icon: "cookie", title: "Deep caramel flavour", text: "Adds warm colour and depth to baking." },
      { icon: "gift", title: "Vegan", text: "No bone char or animal by-products are used." },
      { icon: "chef", title: "Sweet or savoury", text: "Used in baking, sauces and beverages." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "Brownies, cookies and cakes",
        "A topping for oatmeal and porridge",
        "Asian-style sauces and beverages",
        "Coffee, tea and milk",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container in a cool, dry place so it stays free-flowing.",
    },
  },

  "palm-candy-panakarkandu-1lb": {
    eyebrow: "Palm Candy · Panakarkandu · 1 lb",
    headline: "Panakarkandu: crystallised palm sap.",
    intro: [
      "Palm candy, panakarkandu in Tamil, is a type of rock sugar made from palm sap (panam pathaneer). The sap is tapped from the flower of the palmyra, boiled to a syrup and allowed to crystallise into pieces of different shapes and sizes.",
      "It has a mild, clean sweetness and is delightful in baking and as a topping for oatmeal.",
    ],
    facts: ["Net 1 lb", "From palm sap", "Rock-sugar crystals"],
    points: [
      { icon: "leaf", title: "From the palmyra flower", text: "Tapped, boiled to a syrup and crystallised." },
      { icon: "cookie", title: "Mild sweetness", text: "Gentler than jaggery, with a clean caramel hint." },
      { icon: "coffee", title: "A traditional sweetener", text: "Often dissolved in warm milk, tea or kaapi." },
      { icon: "chef", title: "Sweets and desserts", text: "Used in payasam, brownies, cookies and cakes." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "Dissolved in warm milk",
        "Crushed into payasam and kheer",
        "Brownies, cookies and cakes",
        "A topping for oatmeal",
      ],
    },
    note: {
      title: "Using it",
      text: "The crystals dissolve slowly; crush them or warm them in the liquid for faster results.",
    },
  },

  // ── Palm-jaggery sweets ──────────────────────────────────────────────────
  "karupatti-palm-jaggery-assorted-sweets-250g": {
    eyebrow: "Karupatti Assorted Sweets · 250 g",
    headline: "A box of palm-jaggery sweets, made the old way.",
    intro: [
      "Karupatti, jaggery from the palmyra palm, gives traditional Tamil sweets a deep, caramel sweetness that refined sugar cannot match.",
      "This 250 g assortment brings together palm-jaggery sweets, made with native palm jaggery to retain their traditional taste.",
    ],
    facts: ["Net 250 g", "Palm jaggery", "No preservatives"],
    points: [
      PALM_NOTE,
      { icon: "gift", title: "Perfect for gifting", text: "A pretty box to share at festivals or send as a gift." },
      { icon: "cookie", title: "Deep, caramel taste", text: "Karupatti brings a richer sweetness than sugar." },
      { icon: "award", title: "Traditional recipes", text: "Classic Tamil sweets with a palm-jaggery twist." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "As a sweet ending to a festival meal",
        "Shared with tea or coffee in the evening",
        "Gifted for Deepavali, Pongal and birthdays",
        "A treat for the lunchbox",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container in a cool, dry place and consume within the date shown on the pack.",
    },
  },

  "karupatti-palm-jaggery-halwa-250g": {
    eyebrow: "Karupatti Palm Jaggery Halwa · 250 g",
    headline: "Halwa, slow-cooked with palm jaggery.",
    intro: [
      "Halwa is a festive favourite across India: a thick, glossy sweet stirred slowly until it comes together. Here it is sweetened with karupatti, native palm jaggery, for a darker, deeper caramel taste.",
      "Made without preservatives or additives.",
    ],
    facts: ["Net 250 g", "Palm jaggery", "No preservatives"],
    points: [
      PALM_NOTE,
      { icon: "cookie", title: "Rich caramel taste", text: "Karupatti gives halwa its dark colour and deep sweetness." },
      { icon: "chef", title: "Slow-cooked", text: "Halwa is traditionally stirred patiently until it sets." },
      { icon: "gift", title: "Festival classic", text: "A sweet for Deepavali, Pongal and weddings." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "Served as is, a spoonful after a meal",
        "Warmed slightly with a spoon of ghee",
        "With a scoop of vanilla ice cream",
        "Gifted during festivals",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container; refrigerate in warm weather and bring to room temperature before serving.",
    },
  },

  "karupatti-palm-jaggery-jangiri-250g": {
    eyebrow: "Karupatti Palm Jaggery Jangiri · 250 g",
    headline: "Jangiri, soaked in palm jaggery syrup.",
    intro: [
      "Jangiri is a South Indian sweet: urad dal batter piped into flower-shaped coils, fried, and soaked in syrup. It looks like jalebi but is made from urad dal rather than refined flour, and it is chewier and juicier.",
      "Here the syrup is made with karupatti, native palm jaggery, with no preservatives or additives.",
    ],
    facts: ["Net 250 g", "Palm jaggery", "No preservatives"],
    points: [
      PALM_NOTE,
      { icon: "wheat", title: "Made from urad dal", text: "Jangiri uses urad dal; jalebi uses refined flour." },
      { icon: "cookie", title: "Juicy and chewy", text: "Soaked in syrup until every coil is saturated." },
      { icon: "gift", title: "A festival sweet", text: "A familiar celebration sweet with a palm-jaggery twist." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "As a sweet after the festive meal",
        "Served with a cup of tea",
        "Gifted with other Deepavali sweets",
        "Served warm, lightly heated",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container in a cool place; best enjoyed within a few days of opening.",
    },
  },

  "karupatti-palm-jaggery-mysore-pak-250g": {
    eyebrow: "Karupatti Palm Jaggery Mysore Pak · 250 g",
    headline: "Mysore pak, with palm jaggery.",
    intro: [
      "Mysore pak is a rich sweet of gram flour and ghee, said to have been created in the royal kitchens of the Kingdom of Mysore. It is crumbly and melt-in-the-mouth, golden and fragrant with ghee.",
      "This version is sweetened with karupatti, native palm jaggery, with no preservatives or additives.",
    ],
    facts: ["Net 250 g", "Palm jaggery", "No preservatives"],
    points: [
      PALM_NOTE,
      { icon: "award", title: "A royal sweet", text: "Credited to a palace cook in Mysore; the story varies by teller." },
      { icon: "droplets", title: "Rich with ghee", text: "The classic recipe uses plenty of ghee." },
      { icon: "cookie", title: "Melt-in-the-mouth", text: "A fine, soft crumb that dissolves quickly." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "A small square after the meal",
        "With tea or coffee",
        "Gifted at Deepavali and weddings",
        "Crumbled over ice cream",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container in a cool, dry place and away from direct sun.",
    },
  },

  // ── Traditional sweets and treats ────────────────────────────────────────
  "tirunelveli-ghee-halwa-250g": {
    eyebrow: "Tirunelveli Ghee Halwa · 250 g",
    headline: "The famous halwa of Tirunelveli.",
    intro: [
      "Tirunelveli halwa is one of Tamil Nadu's best-known sweets. It is traditionally made from wheat milk (extracted from whole wheat), sugar and plenty of ghee, stirred slowly in large vessels until it turns glossy and translucent.",
      "The classic recipe is labour-intensive, which is part of what makes it special.",
    ],
    facts: ["Net 250 g", "Ghee halwa", "Traditional sweet"],
    points: [
      { icon: "pin", title: "A Tirunelveli classic", text: "The town's signature sweet, known across Tamil Nadu." },
      { icon: "droplets", title: "Rich with ghee", text: "Generous ghee gives the halwa its gloss and aroma." },
      { icon: "hourglass", title: "Slow-made", text: "Traditionally takes days: soaking, extracting wheat milk and slow cooking." },
      { icon: "cookie", title: "Soft, chewy bite", text: "A glossy, slightly springy texture." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "Served as is, in small pieces",
        "A festival and wedding sweet",
        "Gifted at Deepavali and Pongal",
        "Warmed slightly before serving",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container in a cool, dry place. Refrigerate in warm weather and bring to room temperature before serving.",
    },
  },

  "mithra-kamarkattu": {
    eyebrow: "Mithra Kamarkattu",
    headline: "Kamarkattu: the candy of childhood.",
    intro: [
      "Kamarkattu (also kamarkat or kalkona) is a traditional South Indian candy made from coconut cooked in jaggery syrup and shaped into small balls while still warm. For many of us it was the sweet we bought for a few coins on the way home from school.",
      "Mithra Kamarkattu is made of sweet balls of jaggery and grated coconut, flavoured with cardamom.",
    ],
    facts: ["Jaggery & coconut", "Cardamom-scented", "Nostalgic sweet"],
    points: [
      { icon: "award", title: "A childhood candy", text: "Once sold by street vendors across South India." },
      { icon: "leaf", title: "Jaggery and coconut", text: "Simple, traditional ingredients, scented with cardamom." },
      { icon: "cookie", title: "Long-lasting sweetness", text: "A firm candy that you enjoy slowly." },
      { icon: "gift", title: "Nostalgia in a pouch", text: "A thoughtful gift for anyone who grew up on it." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "A sweet bite after lunch",
        "Tucked into the lunchbox",
        "Shared at festivals and gatherings",
        "A nostalgic treat with evening tea",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container; avoid humidity, which can make the candy sticky.",
    },
  },

  "mithra-elantha-vadai-100g": {
    eyebrow: "Mithra Elantha Vadai · 100 g",
    headline: "Elantha vadai: sweet, sour and spicy in one bite.",
    intro: [
      "Elantha vadai is a traditional treat from southern Tamil Nadu, made from elantha pazham (Indian jujube, also called ber). The sun-dried fruit is pounded with tamarind, red chillies, salt and jaggery, shaped into small discs and dried again.",
      "A favourite from school days, it hits sweet, sour and spicy notes at once.",
    ],
    facts: ["Net 100 g (3.52 oz)", "Jujube · Jaggery", "Sweet, sour, spicy"],
    points: [
      { icon: "sun", title: "Sun-dried jujube", text: "Made with elantha pazham, which ripens from December to March." },
      { icon: "flame", title: "Sweet, sour, spicy", text: "Jaggery, red chilli and salt create a layered flavour." },
      { icon: "award", title: "Southern Tamil Nadu tradition", text: "A popular school-time snack for generations." },
      { icon: "gift", title: "A nostalgic treat", text: "A taste that takes many people straight back to childhood." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "A tangy snack with evening tea",
        "Tucked into the lunchbox or travel bag",
        "Shared as a nostalgic treat",
        "Crumbled over curd rice for a tangy kick",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container in a cool, dry place so the vadais stay firm.",
    },
  },

  "mithra-groundnut-chikki-200g": {
    eyebrow: "Mithra Groundnut Chikki · 200 g",
    headline: "Peanut chikki, set in pure jaggery.",
    intro: [
      "Chikki is a classic Indian brittle: roasted peanuts set in jaggery syrup and cut into crisp squares. A snack for festivals, train journeys and evening tea.",
      "Mithra Groundnut Chikki is made with roasted peanuts and pure sugarcane jaggery.",
    ],
    facts: ["Net 200 g (7.05 oz)", "Peanuts & jaggery", "Crisp brittle"],
    points: [
      { icon: "nut", title: "Roasted peanuts", text: "Crunchy peanuts roasted until fragrant." },
      { icon: "leaf", title: "Pure sugarcane jaggery", text: "Sweetened with jaggery rather than refined sugar." },
      { icon: "cookie", title: "Crisp and snappy", text: "A satisfying brittle with a nutty crunch." },
      { icon: "gift", title: "Easy to share", text: "Cut into squares for packing and gifting." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "An evening snack with tea or coffee",
        "Packed for school and the office",
        "A festival sweet for Pongal and Deepavali",
        "Crushed over ice cream or yogurt",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container; humidity softens the brittle.",
    },
  },

  "sesame-candy-250g": {
    eyebrow: "Sesame Candy · Ellu Mittai · 250 g",
    headline: "Black sesame and jaggery, nutty and crunchy.",
    intro: [
      "Ellu mittai is a traditional sesame candy: black sesame seeds are roasted, mixed with caramelised jaggery and set into a barfi. It is made in South Indian homes for festive seasons.",
      "Nutty, crunchy and sweet, it is a classic with a long tradition.",
    ],
    facts: ["Net 250 g", "Black sesame · Jaggery", "Festive sweet"],
    points: [
      { icon: "flame", title: "Roasted sesame", text: "Black sesame, roasted for a deep, nutty flavour." },
      { icon: "leaf", title: "Jaggery-sweetened", text: "Caramelised jaggery binds the seeds into a crisp bar." },
      { icon: "award", title: "A festive tradition", text: "Made to bring goodness and happiness through the year." },
      { icon: "cookie", title: "Crunchy bite", text: "A nutty, crisp candy." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "A sweet bite after the meal",
        "A snack with evening tea",
        "Shared at Pongal and other festivals",
        "Gifted in a box with other traditional sweets",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container in a cool, dry place.",
    },
  },

  "sesame-balls-250g": {
    eyebrow: "Sesame Balls · Ellu Urundai · 250 g",
    headline: "Ellu urundai: sesame balls in jaggery.",
    intro: [
      "Ellu urundai is a traditional South Indian sweet of roasted sesame seeds shaped into small balls, classically held together with jaggery syrup. It is made for festivals like Pongal and Deepavali.",
      "Nutty and mildly sweet, it is a bite-sized snack. Please check the pack for the full ingredient list.",
    ],
    facts: ["Net 250 g", "Roasted sesame", "Bite-sized"],
    points: [
      { icon: "flame", title: "Roasted sesame", text: "Sesame roasted until fragrant and nutty." },
      { icon: "leaf", title: "Traditionally jaggery-bound", text: "Jaggery syrup classically holds the seeds together." },
      { icon: "award", title: "A festive sweet", text: "Traditional for Pongal and Deepavali." },
      { icon: "gift", title: "Bite-sized", text: "Easy to share, easy to pack." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "A sweet snack with evening tea",
        "Shared at festivals and gatherings",
        "Packed in the lunchbox",
        "Gifted with other traditional sweets",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container in a cool, dry place.",
    },
  },

  "foxtail-millet-laddu-250g": {
    eyebrow: "Foxtail Millet Laddu · 250 g",
    headline: "Thinai laddu, made with natural jaggery.",
    intro: [
      "Laddu is a round sweet, and a millet laddu is a traditional way to enjoy millet: ground foxtail millet (thinai) bound into round balls with jaggery.",
      "Made with 100% natural jaggery and traditional methods.",
    ],
    facts: ["Net 250 g", "Foxtail millet", "Natural jaggery"],
    points: [
      { icon: "wheat", title: "Foxtail millet", text: "Thinai, one of South India's oldest grains." },
      { icon: "leaf", title: "100% natural jaggery", text: "Sweetened with jaggery rather than refined sugar." },
      { icon: "award", title: "Traditional methods", text: "A homestyle laddu, made the old way." },
      { icon: "gift", title: "Easy to share", text: "A round, bite-sized sweet." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "A sweet after the meal",
        "An evening snack with tea or milk",
        "Packed in the lunchbox",
        "Shared at festivals",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container in a cool, dry place and use within the date on the pack.",
    },
  },

  "little-millet-laddu-250g": {
    eyebrow: "Little Millet Laddu · 250 g",
    headline: "Samai laddu: a millet sweet for the family.",
    intro: [
      "Laddu is a round sweet, and a millet laddu is a traditional way to enjoy millet. This one is made with little millet, samai in Tamil, one of South India's most familiar small grains.",
      "Please check the pack for the full ingredient list.",
    ],
    facts: ["Net 250 g", "Little millet", "Bite-sized"],
    points: [
      { icon: "wheat", title: "Little millet", text: "Samai, a small, soft-cooking millet." },
      { icon: "cookie", title: "A traditional round sweet", text: "Laddu is a festive favourite across India." },
      { icon: "gift", title: "Easy to share", text: "A round, bite-sized sweet." },
      { icon: "leaf", title: "Check the label", text: "The ingredient list on the pack is the definitive guide." },
    ],
    uses: {
      heading: "Ways to enjoy it",
      items: [
        "A sweet after the meal",
        "An evening snack with tea or milk",
        "Packed in the lunchbox",
        "Shared at festivals",
      ],
    },
    note: {
      title: "Storage",
      text: "Keep in an airtight container in a cool, dry place and use within the date on the pack.",
    },
  },
}
