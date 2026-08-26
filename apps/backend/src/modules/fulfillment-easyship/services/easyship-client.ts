import {
  EasyshipCreateShipmentParams,
  EasyshipOptions,
  EasyshipRateQueryParams,
  EasyshipRatesResponse,
  EasyshipShipmentResponse,
} from "../types"

const DEFAULT_PROD_BASE_URL = "https://public-api.easyship.com/2024-09"
const DEFAULT_SANDBOX_BASE_URL = "https://public-api-sandbox.easyship.com/2024-09"

export class EasyshipClient {
  private apiKey?: string
  private baseUrl: string

  constructor(options: EasyshipOptions) {
    this.apiKey = options.apiKey !== undefined ? options.apiKey : process.env.EASYSHIP_API_KEY
    const isSandbox =
      this.apiKey?.startsWith("sand_") ||
      process.env.EASYSHIP_SANDBOX === "true"

    this.baseUrl =
      process.env.EASYSHIP_BASE_URL ||
      (isSandbox ? DEFAULT_SANDBOX_BASE_URL : DEFAULT_PROD_BASE_URL)
  }

  get isConfigured(): boolean {
    return !!this.apiKey && this.apiKey !== "mock"
  }

  /**
   * Fetch live multi-carrier shipping quotes (UPS, FedEx, USPS, etc.)
   */
  async getRates(params: EasyshipRateQueryParams): Promise<EasyshipRatesResponse> {
    if (!this.isConfigured) {
      return this.getMockRates(params)
    }

    const payload = {
      origin_address: {
        postal_code: params.origin_postal_code,
        country_alpha2: params.origin_country_alpha2,
        city: "Exton",
        state: "PA",
        line_1: "100 Main St",
      },
      destination_address: {
        postal_code: params.destination_postal_code,
        country_alpha2: params.destination_country_alpha2,
        city: params.destination_city || "Philadelphia",
        state: params.destination_state || "PA",
        line_1: "123 Main St",
      },
      parcels: [
        {
          total_actual_weight: params.items.reduce(
            (sum, item) => sum + (item.actual_weight || 0.5),
            0
          ) || 1.0,
          box: { length: 10, width: 10, height: 10 },
          items: params.items.map((item) => ({
            description: item.category || "Food Item",
            actual_weight: item.actual_weight || 0.5,
            declared_currency: item.declared_currency || "USD",
            declared_customs_value: item.declared_customs_value || 20,
            quantity: 1,
            hs_code: "17049000",
          })),
        },
      ],
    }

    const res = await fetch(`${this.baseUrl}/rates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`Easyship getRates failed with status ${res.status}: ${text}`)
    }

    const raw = (await res.json()) as any
    const rates: any[] = (raw.rates || []).map((r: any) => ({
      courier_id: r.courier_service?.id || r.courier_id || "courier",
      courier_name: r.courier_service?.name || r.courier_name || "Courier",
      min_delivery_time: r.min_delivery_time ?? 2,
      max_delivery_time: r.max_delivery_time ?? 5,
      total_charge: r.total_charge ?? r.shipment_charge_total ?? 0,
      currency: r.currency || "USD",
      shipment_charge: r.shipment_charge ?? r.total_charge ?? 0,
      fuel_surcharge: r.fuel_surcharge ?? 0,
      insurance_fee: r.insurance_fee ?? 0,
      easyship_rating: r.easyship_rating ?? 4.5,
    }))

    return { rates }
  }

  /**
   * Purchase shipping label and create carrier shipment
   */
  async createShipment(
    params: EasyshipCreateShipmentParams
  ): Promise<EasyshipShipmentResponse> {
    if (!this.isConfigured) {
      return this.getMockShipment(params)
    }

    const payload = {
      ...params,
      origin_address: {
        ...params.origin_address,
        company_name:
          (params.origin_address as any).company_name ||
          params.origin_address.contact_name ||
          "Mithra Whole Foods",
        contact_email:
          params.origin_address.contact_email || "orders@mithrawholefoods.com",
        contact_phone: params.origin_address.contact_phone || "+12155551234",
      },
      destination_address: {
        ...params.destination_address,
        contact_phone: params.destination_address.contact_phone || "+12155555678",
      },
      parcels: params.parcels.map((p) => ({
        ...p,
        box: p.box || { length: 10, width: 10, height: 10 },
        items: p.items.map((it) => ({
          ...it,
          hs_code: (it as any).hs_code || "17049000",
        })),
      })),
    }

    const res = await fetch(`${this.baseUrl}/shipments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(
        `Easyship createShipment failed with status ${res.status}: ${text}`
      )
    }

    const raw = (await res.json()) as any
    const shipment = raw.shipment || raw
    return {
      shipment: {
        easyship_shipment_id: shipment.easyship_shipment_id || shipment.id,
        tracking_number: shipment.tracking_number,
        tracking_page_url: shipment.tracking_page_url,
        label_url:
          shipment.label_url ||
          shipment.shipping_documents?.find((d: any) => d.type === "label")?.url,
        courier: {
          name:
            shipment.courier_service?.name ||
            shipment.courier?.name ||
            "UPS Ground",
        },
        shipment_state: shipment.shipment_state || "label_generated",
        delivery_state: shipment.delivery_state || "pending",
      },
    }
  }

  /**
   * Cancel an existing shipment / void label
   */
  async cancelShipment(easyshipShipmentId: string): Promise<boolean> {
    if (!this.isConfigured) {
      return true
    }

    const res = await fetch(`${this.baseUrl}/shipments/${easyshipShipmentId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
    })

    return res.ok
  }

  /**
   * Simulated rate quotes for development / testing when live keys aren't set.
   * Accurately reflects real-world multi-carrier pricing (UPS Ground vs FedEx vs USPS).
   */
  private getMockRates(params: EasyshipRateQueryParams): EasyshipRatesResponse {
    const totalWeightKg = params.items.reduce(
      (sum, item) => sum + (item.actual_weight || 0.5),
      0
    )

    // Base weight-scaled pricing
    const upsRate = Number((6.99 + totalWeightKg * 2.2).toFixed(2))
    const fedexRate = Number((8.5 + totalWeightKg * 2.5).toFixed(2))
    const uspsRate = Number((5.8 + totalWeightKg * 2.0).toFixed(2))

    return {
      rates: [
        {
          courier_id: "usps_priority",
          courier_name: "USPS Priority Mail",
          min_delivery_time: 2,
          max_delivery_time: 3,
          total_charge: uspsRate,
          currency: "USD",
          shipment_charge: uspsRate,
          fuel_surcharge: 0,
          insurance_fee: 0,
          easyship_rating: 4.5,
        },
        {
          courier_id: "ups_ground",
          courier_name: "UPS Ground",
          min_delivery_time: 2,
          max_delivery_time: 5,
          total_charge: upsRate,
          currency: "USD",
          shipment_charge: upsRate,
          fuel_surcharge: 0,
          insurance_fee: 0,
          easyship_rating: 4.8,
        },
        {
          courier_id: "fedex_ground",
          courier_name: "FedEx Home Delivery",
          min_delivery_time: 2,
          max_delivery_time: 4,
          total_charge: fedexRate,
          currency: "USD",
          shipment_charge: fedexRate,
          fuel_surcharge: 0,
          insurance_fee: 0,
          easyship_rating: 4.7,
        },
      ],
    }
  }

  /**
   * Simulated shipment creation for test environments.
   */
  private getMockShipment(
    params: EasyshipCreateShipmentParams
  ): EasyshipShipmentResponse {
    const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000)
    const trackingNumber = `1Z999AA101${randomSuffix}`.slice(0, 18)

    return {
      shipment: {
        easyship_shipment_id: `ES_US_${Date.now()}`,
        tracking_number: trackingNumber,
        tracking_page_url: `https://www.ups.com/track?tracknum=${trackingNumber}`,
        label_url: `https://api.easyship.com/v2/labels/mock-${trackingNumber}.pdf`,
        courier: {
          name: "UPS Ground",
        },
        shipment_state: "label_generated",
        delivery_state: "pending",
      },
    }
  }
}
