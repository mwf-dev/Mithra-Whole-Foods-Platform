/**
 * The business as printed on invoices and packing slips. Mirrors the
 * storefront's `apps/web/src/lib/business.ts` (the client's own signage); each
 * value can be overridden by an env var without a code change.
 */
export const BUSINESS = {
  name: process.env.BUSINESS_NAME || "Mithra Whole Foods",
  legalName: process.env.BUSINESS_LEGAL_NAME || "Mithra Sastra Overseas LLC",
  addressLines: [
    process.env.BUSINESS_STREET || "801 Springdale Dr",
    process.env.BUSINESS_CITY_LINE || "Exton, PA 19341",
  ],
  phone: process.env.BUSINESS_PHONE || "610-202-3456",
  email: process.env.BUSINESS_EMAIL || "mithrasastra@gmail.com",
  // Only printed when set — the storefront URL is a railway.app address until the real domain is live.
  website: (process.env.BUSINESS_WEBSITE || "").replace(/^https?:\/\//, "").replace(/\/$/, ""),
} as const
