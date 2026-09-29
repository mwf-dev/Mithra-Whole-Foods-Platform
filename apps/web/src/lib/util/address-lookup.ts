/**
 * US address lookup helpers for the checkout form. All keyless & free:
 *
 *   - lookupUsZip:        ZIP -> city/state via Zippopotam.us
 *   - autocompleteAddress: type-and-pick suggestions via Photon (komoot)
 *   - reverseGeocode:     lat/lng -> address via Photon, OSM/Nominatim fallback
 *
 * Photon (https://github.com/komoot/photon) is an open-source OpenStreetMap
 * geocoder built for search-as-you-type. We use its free public instance; the
 * fair-use limit is fine for checkout volume. To remove the limit / go fully
 * self-owned, run Photon in Docker and point PHOTON_BASE_URL at it.
 */

const PHOTON_BASE =
  process.env.NEXT_PUBLIC_PHOTON_BASE_URL || "https://photon.komoot.io"

export type ResolvedAddress = {
  address_1?: string
  city?: string
  province?: string // state (name/code as provided)
  postal_code?: string
  country_code?: string // iso-2, lowercase
}

export type AddressSuggestion = ResolvedAddress & {
  label: string // human-readable, shown in the dropdown
  key: string // stable list key
}

/** ZIP -> { city, state } via Zippopotam.us. No API key required. */
export async function lookupUsZip(
  zip: string
): Promise<{ city: string; state: string } | null> {
  if (!/^\d{5}$/.test(zip)) return null
  try {
    const res = await fetch(`https://api.zippopotam.us/us/${zip}`)
    if (!res.ok) return null
    const data = await res.json()
    const place = data?.places?.[0]
    if (!place) return null
    return {
      city: place["place name"],
      state: place["state abbreviation"] || place["state"] || "",
    }
  } catch {
    return null
  }
}

/** Map a Photon GeoJSON feature's properties to our form shape. */
function mapPhotonProps(p: any, index = 0): AddressSuggestion {
  const line1 =
    [p.housenumber, p.street].filter(Boolean).join(" ") || p.name || ""
  const label =
    [line1 || p.name, p.city || p.district, p.state, p.postcode]
      .filter(Boolean)
      .join(", ") || p.name
  return {
    label,
    key: `${p.osm_type || "x"}${p.osm_id || index}`,
    address_1: line1,
    city: p.city || p.district || p.locality || "",
    province: p.state || "",
    postal_code: p.postcode || "",
    country_code: (p.countrycode || "US").toLowerCase(),
  }
}

/** Photon autocomplete suggestions, biased to US. [] if query too short. */
export async function autocompleteAddress(
  query: string
): Promise<AddressSuggestion[]> {
  if (query.trim().length < 3) return []
  try {
    const res = await fetch(
      `${PHOTON_BASE}/api/?q=${encodeURIComponent(query)}&limit=8&lang=en`
    )
    if (!res.ok) return []
    const data = await res.json()
    return (data?.features || [])
      .map((f: any) => f.properties)
      .filter((p: any) => (p.countrycode || "US") === "US")
      .map((p: any, i: number) => mapPhotonProps(p, i))
      .slice(0, 6)
  } catch {
    return []
  }
}

/** Reverse-geocode coordinates to an address. Photon first, then Nominatim. */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ResolvedAddress | null> {
  try {
    const res = await fetch(
      `${PHOTON_BASE}/reverse?lat=${latitude}&lon=${longitude}&lang=en`
    )
    if (res.ok) {
      const data = await res.json()
      const p = data?.features?.[0]?.properties
      if (p) return mapPhotonProps(p)
    }
  } catch {
    // fall through to the secondary provider
  }

  // Keyless fallback (OpenStreetMap Nominatim). Low volume only.
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
      { headers: { "Accept-Language": "en" } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const a = data?.address
    if (!a) return null
    return {
      address_1: [a.house_number, a.road].filter(Boolean).join(" "),
      city: a.city || a.town || a.village || a.hamlet || a.suburb || "",
      province: a.state || "",
      postal_code: a.postcode || "",
      country_code: (a.country_code || "us").toLowerCase(),
    }
  } catch {
    return null
  }
}
