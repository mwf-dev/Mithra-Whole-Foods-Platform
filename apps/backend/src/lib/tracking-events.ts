/**
 * Shipment status history, stored on `fulfillment.metadata.tracking_events`.
 * Written by the Easyship webhook (courier) and the admin Ship orders buttons
 * (manual delivery); read by the admin page, the account order page and /track.
 * Pure on purpose so the dedupe and normalisation rules are unit-testable.
 */
export type DeliveryMethod = "courier" | "manual"

export type TrackingStatus =
  | "label_created"
  | "in_transit"
  | "out_for_delivery"
  | "exception"
  | "delivered"

export type TrackingEvent = {
  status: TrackingStatus
  at: string
  source: "easyship" | "admin"
  note?: string
}

export const STATUS_LABEL: Record<TrackingStatus, string> = {
  label_created: "Label created",
  in_transit: "In transit",
  out_for_delivery: "Out for delivery",
  exception: "Delivery problem",
  delivered: "Delivered",
}

/** Maps Easyship's free-form status strings onto the five we show. */
export function normalizeStatus(raw: unknown): TrackingStatus | null {
  const s = String(raw ?? "").toLowerCase().replace(/[\s-]+/g, "_")
  if (!s) return null
  if (["delivered", "delivered_to_customer", "completed"].includes(s)) return "delivered"
  if (s.includes("out_for_delivery")) return "out_for_delivery"
  if (s.includes("exception") || s.includes("failed") || s.includes("returned") || s.includes("undeliverable")) {
    return "exception"
  }
  if (s.includes("in_transit") || s === "picked_up" || s.includes("transit")) return "in_transit"
  if (s.includes("label") || s === "pending" || s === "info_received") return "label_created"
  return null
}

export function readEvents(metadata: unknown): TrackingEvent[] {
  const list = (metadata as any)?.tracking_events
  return Array.isArray(list) ? (list as TrackingEvent[]) : []
}

/**
 * Appends an event unless it repeats the latest status (webhooks are retried).
 * Once delivered, later non-delivered events are ignored: carriers sometimes
 * send a stale "in transit" after the final scan.
 */
export function appendEvent(
  metadata: Record<string, unknown> | null | undefined,
  event: TrackingEvent
): { metadata: Record<string, unknown>; added: boolean } {
  const base = { ...(metadata ?? {}) }
  const events = readEvents(base)
  const last = events[events.length - 1]
  if (last && last.status === event.status) return { metadata: base, added: false }
  if (events.some((e) => e.status === "delivered") && event.status !== "delivered") {
    return { metadata: base, added: false }
  }
  return { metadata: { ...base, tracking_events: [...events, event] }, added: true }
}

/** Customer-safe projection: no internal notes or sources. */
export function publicTimeline(metadata: unknown): { status: TrackingStatus; label: string; at: string }[] {
  return readEvents(metadata).map((e) => ({ status: e.status, label: STATUS_LABEL[e.status], at: e.at }))
}

export const TRACKING_FIELDS = [
  "fulfillments.id",
  "fulfillments.metadata",
  "fulfillments.packed_at",
  "fulfillments.shipped_at",
  "fulfillments.delivered_at",
  "fulfillments.canceled_at",
  "fulfillments.labels.tracking_number",
  "fulfillments.labels.tracking_url",
]

/** What a shopper may see about each shipment (no driver, no internal notes). */
export function publicFulfillments(fulfillments: any[] = []) {
  return fulfillments
    .filter((f) => f && !f.canceled_at)
    .map((f) => ({
      packed_at: f.packed_at ?? null,
      shipped_at: f.shipped_at ?? null,
      delivered_at: f.delivered_at ?? null,
      delivery_method: (f.metadata?.delivery_method as DeliveryMethod | undefined) ?? null,
      events: publicTimeline(f.metadata),
      tracking: (f.labels ?? [])
        .filter((l: any) => l?.tracking_number)
        .map((l: any) => ({ number: l.tracking_number, url: l.tracking_url || null })),
    }))
}
