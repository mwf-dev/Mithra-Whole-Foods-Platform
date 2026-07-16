"use client"

import { MapPin, Spinner } from "@medusajs/icons"
import { useEffect, useRef, useState } from "react"
import {
  AddressSuggestion,
  ResolvedAddress,
  autocompleteAddress,
  reverseGeocode,
} from "@lib/util/address-lookup"

/**
 * Address search + "use my current location" for checkout. Calls onResolved
 * with the picked/located address; the parent merges it into the form.
 * The search box only renders when Radar is configured; the location button
 * always works (Radar or keyless OSM fallback).
 */
const AddressAutofill = ({
  onResolved,
}: {
  onResolved: (address: ResolvedAddress) => void
}) => {
  const [query, setQuery] = useState("")
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [open, setOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced autocomplete lookups.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (query.trim().length < 3) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      const results = await autocompleteAddress(query)
      setSuggestions(results)
      setOpen(results.length > 0)
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Close the dropdown when clicking away.
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const pickSuggestion = (s: AddressSuggestion) => {
    onResolved(s)
    setQuery("")
    setSuggestions([])
    setOpen(false)
    setError(null)
  }

  const useMyLocation = () => {
    setError(null)
    if (!navigator.geolocation) {
      setError("Location isn't supported by this browser.")
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const resolved = await reverseGeocode(
          pos.coords.latitude,
          pos.coords.longitude
        )
        setLocating(false)
        if (resolved) {
          onResolved(resolved)
        } else {
          setError("Couldn't find an address for your location.")
        }
      },
      () => {
        setLocating(false)
        setError("Location permission was denied.")
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="mb-6" ref={containerRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Start typing your address…"
          autoComplete="off"
          className="w-full rounded-md border border-ui-border-base bg-ui-bg-field px-4 py-3 text-base-regular outline-none focus:border-ui-border-interactive"
          data-testid="address-autocomplete-input"
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-ui-border-base bg-ui-bg-base shadow-lg">
            {suggestions.map((s) => (
              <li key={s.key}>
                <button
                  type="button"
                  onClick={() => pickSuggestion(s)}
                  className="flex w-full items-start gap-x-2 px-4 py-2.5 text-left text-small-regular hover:bg-ui-bg-base-hover"
                  data-testid="address-suggestion"
                >
                  <MapPin className="mt-0.5 shrink-0 text-ui-fg-muted" />
                  <span>{s.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        disabled={locating}
        className="mt-2 flex items-center gap-x-2 text-small-regular text-ui-fg-interactive hover:text-ui-fg-interactive-hover disabled:opacity-60"
        data-testid="use-my-location-button"
      >
        {locating ? <Spinner className="animate-spin" /> : <MapPin />}
        {locating ? "Locating…" : "Use my current location"}
      </button>

      {error && (
        <p className="mt-1 text-small-regular text-ui-fg-error">{error}</p>
      )}
    </div>
  )
}

export default AddressAutofill
