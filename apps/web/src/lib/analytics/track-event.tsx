"use client"

import { useEffect, useRef } from "react"

import { track } from "./client"
import type { CommerceEventMap, CommerceEventName } from "./events"

/**
 * Fires one analytics event when this renders.
 *
 * Exists so server components can report events without becoming client
 * components themselves: a page stays server-rendered and just drops
 * `<TrackEvent name="product_viewed" properties={…} />` into its tree.
 *
 * De-duplication matters more than it looks. React 19 Strict Mode double-mounts
 * effects in development, and this app re-renders routes on `router.refresh()`
 * after every cart mutation — without a guard, one product view would report
 * two or three times and every funnel conversion rate would be wrong. The
 * serialised payload is used as the identity key, so a genuine change (a
 * different product, a new search query) does fire again.
 */
export default function TrackEvent<K extends CommerceEventName>({
  name,
  properties,
}: {
  name: K
  properties: CommerceEventMap[K]
}) {
  const key = `${name}:${JSON.stringify(properties)}`
  const lastSent = useRef<string | null>(null)

  useEffect(() => {
    if (lastSent.current === key) {
      return
    }

    lastSent.current = key
    track(name, properties)
    // `key` is the payload identity; name/properties are captured with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  return null
}
