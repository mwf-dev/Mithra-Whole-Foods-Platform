export interface EasyshipOptions {
  apiKey?: string
  apiSecret?: string
  webhookSecret?: string
  shipFromZip?: string
  shipFromCity?: string
  shipFromState?: string
  shipFromCountry?: string
  shipFromAddress?: string
  shipFromName?: string
  isSandbox?: boolean
}

export interface EasyshipRateQueryItem {
  actual_weight: number // in kg
  height?: number // in cm
  width?: number
  length?: number
  category?: string
  declared_currency?: string
  declared_customs_value?: number
}

export interface EasyshipRateQueryParams {
  origin_postal_code: string
  origin_country_alpha2: string
  destination_postal_code: string
  destination_country_alpha2: string
  destination_city?: string
  destination_state?: string
  items: EasyshipRateQueryItem[]
}

export interface EasyshipRateItem {
  courier_id: string
  courier_name: string
  min_delivery_time: number
  max_delivery_time: number
  total_charge: number // in currency unit, e.g. USD
  currency: string
  shipment_charge: number
  fuel_surcharge: number
  insurance_fee: number
  easyship_rating?: number
  tracking_rating?: number
}

export interface EasyshipRatesResponse {
  rates: EasyshipRateItem[]
}

export interface EasyshipCreateShipmentParams {
  origin_address: {
    line_1: string
    city: string
    state: string
    postal_code: string
    country_alpha2: string
    contact_name: string
    contact_phone?: string
    contact_email?: string
  }
  destination_address: {
    line_1: string
    line_2?: string
    city: string
    state: string
    postal_code: string
    country_alpha2: string
    contact_name: string
    contact_phone?: string
    contact_email?: string
  }
  parcels: Array<{
    total_actual_weight: number
    box?: {
      length: number
      width: number
      height: number
    }
    items: Array<{
      description: string
      quantity: number
      actual_weight: number
      declared_currency: string
      declared_customs_value: number
    }>
  }>
  selected_courier_id?: string
}

export interface EasyshipShipmentResponse {
  shipment: {
    easyship_shipment_id: string
    tracking_number?: string
    tracking_page_url?: string
    label_url?: string
    courier?: {
      name: string
    }
    shipment_state?: string
    delivery_state?: string
  }
}

export interface EasyshipWebhookPayload {
  event_type:
    | "shipment.label.created"
    | "shipment.label.failed"
    | "tracking.status.changed"
    | "shipment.cancelled"
  created_at: string
  data: {
    easyship_shipment_id: string
    platform_order_number?: string
    order_id?: string
    tracking_number?: string
    tracking_page_url?: string
    label_url?: string
    courier_name?: string
    status?: "in_transit" | "out_for_delivery" | "delivered" | "exception" | "cancelled"
    status_details?: string
  }
}
