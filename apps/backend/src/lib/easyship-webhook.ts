/**
 * Pure helpers for Easyship webhook / shipment payloads. Easyship's field names
 * differ between API versions, so each value is looked up in every place it is
 * known to appear instead of trusting a single shape.
 */
const pick = (...vals: unknown[]): string => {
  for (const v of vals) if (typeof v === "string" && v.trim()) return v.trim()
  return ""
}

export type ParsedEasyshipEvent = {
  eventType: string
  trackingNumber: string
  shipmentId: string
  status: string
}

export function parseEasyshipEvent(payload: any): ParsedEasyshipEvent {
  const d = payload?.data ?? {}
  const shipment = d.shipment ?? payload?.shipment ?? {}
  const trackings: any[] = [d.trackings, shipment.trackings, payload?.trackings].find(Array.isArray) ?? []
  const t0 = trackings[0] ?? {}
  return {
    eventType: pick(payload?.event_type, payload?.event, payload?.type),
    trackingNumber: pick(d.tracking_number, t0.tracking_number, shipment.tracking_number, payload?.tracking_number),
    shipmentId: pick(d.easyship_shipment_id, shipment.easyship_shipment_id, payload?.easyship_shipment_id),
    status: pick(
      d.status,
      d.tracking_status,
      d.tracking_state,
      d.delivery_state,
      t0.tracking_state,
      shipment.delivery_state,
      payload?.tracking_status,
      payload?.status
    ).toLowerCase(),
  }
}

/** Reads label purchase results from a create/get shipment response. */
export function parseShipmentResponse(raw: any) {
  const s = raw?.shipment ?? raw ?? {}
  const t0 = (Array.isArray(s.trackings) ? s.trackings[0] : null) ?? {}
  const docs: any[] = Array.isArray(s.shipping_documents) ? s.shipping_documents : []
  const labelDoc = docs.find((d) => d?.type === "label" || d?.category === "label")
  return {
    id: pick(s.easyship_shipment_id, s.id),
    trackingNumber: pick(s.tracking_number, t0.tracking_number),
    trackingUrl: pick(s.tracking_page_url, t0.tracking_page_url, t0.tracking_url),
    labelUrl: pick(s.label_url, labelDoc?.url),
    labelState: pick(s.label_state),
    courier: pick(s.courier_service?.name, s.courier?.name),
    status: pick(s.delivery_state, t0.tracking_state, s.tracking_state).toLowerCase(),
    errors: ((raw?.meta?.errors ?? s?.meta?.errors) as unknown[] | undefined) ?? [],
  }
}
