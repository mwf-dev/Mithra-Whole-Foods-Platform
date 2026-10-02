/**
 * The business behind the storefront, as printed on the client's own signage
 * and business card. One place, so the footer, the contact page, the chat and
 * the structured data search engines read can never disagree.
 */
export const BUSINESS = {
  name: "Mithra Whole Foods",
  legalName: "Mithra Sastra Overseas LLC",
  tagline: "Harvesting Goodness",
  phoneDisplay: "610-202-3456",
  phoneTel: "+16102023456",
  email: "mithrasastra@gmail.com",
  address: {
    street: "801 Springdale Dr",
    city: "Exton",
    region: "PA",
    postalCode: "19341",
    country: "US",
  },
} as const

export const addressLine = () => {
  const a = BUSINESS.address
  return `${a.street}, ${a.city}, ${a.region} ${a.postalCode}`
}

export const mapsUrl = () =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${BUSINESS.legalName} ${addressLine()}`
  )}`

/** What the client's sign lists, in the client's own words and order. */
export const RANGE = [
  "Rice / Traditional Rice",
  "Unpolished Millets",
  "Millet Chutney Powders",
  "Delicious Health Drinks",
  "Cold Pressed Oils",
  "Natural Sweeteners",
  "Millet Noodles",
  "Millet Vermicelli",
  "Millet Porridge Mix",
  "Millet Drink Mix",
  "Lentils / Dals",
  "Snacks / Millet Laddus",
  "Millet Flours",
  "Pure Cow Ghee",
  "Millet Flakes",
  "Pickles",
  "Chikki Candies",
  "Masala Powders",
] as const
