import { AbstractFulfillmentProviderService } from "@medusajs/framework/utils"
import {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceContext,
  CreateFulfillmentResult,
  FulfillmentOption,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import { EasyshipOptions } from "../types"
import { EasyshipClient } from "./easyship-client"

export class EasyshipFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "easyship"

  protected client: EasyshipClient
  protected options: EasyshipOptions

  constructor(
    _container: Record<string, unknown>,
    options: EasyshipOptions = {}
  ) {
    super()
    this.options = options
    this.client = new EasyshipClient(options)
  }

  /**
   * Fulfillment options advertised by this provider in Medusa
   */
  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return [
      {
        id: "easyship-cheapest",
      },
      {
        id: "easyship-fastest",
      },
      {
        id: "easyship-ups-ground",
      },
      {
        id: "easyship-fedex-ground",
      },
      {
        id: "easyship-return",
        is_return: true,
      },
    ]
  }

  /**
   * Validate shipping option data
   */
  async validateOption(_data: Record<string, any>): Promise<boolean> {
    return true
  }

  /**
   * Validate fulfillment data stored on the shipping method during checkout
   */
  async validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext
  ): Promise<any> {
    return data
  }

  /**
   * Indicates dynamic live price calculation is supported
   */
  async canCalculate(): Promise<boolean> {
    return true
  }

  /**
   * Real-time dynamic rate calculation on checkout
   */
  async calculatePrice(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    context: CalculateShippingOptionPriceContext
  ): Promise<CalculatedShippingOptionPrice> {
    const originZip =
      this.options.shipFromZip || process.env.SHIP_FROM_ZIP || "19341" // Exton, PA default
    const originCountry =
      this.options.shipFromCountry || process.env.SHIP_FROM_COUNTRY || "US"

    const destinationAddress = (context as any)?.shipping_address || (context as any)?.address || {}
    const destinationZip =
      destinationAddress.postal_code || (data as any)?.postal_code || "19341"
    const destinationCountry =
      destinationAddress.country_code?.toUpperCase() || "US"

    // Compute total package weight from items (defaulting to 0.5kg per item if unset)
    const items = (context as any)?.items || []
    const parcelItems = items.length
      ? items.map((item: any) => ({
          actual_weight: Number(item.variant?.weight || item.weight || 500) / 1000, // convert g to kg
          declared_currency: "USD",
          declared_customs_value: Number(item.unit_price || 1000) / 100,
        }))
      : [{ actual_weight: 1.0, declared_currency: "USD", declared_customs_value: 20 }]

    try {
      const response = await this.client.getRates({
        origin_postal_code: originZip,
        origin_country_alpha2: originCountry,
        destination_postal_code: destinationZip,
        destination_country_alpha2: destinationCountry,
        destination_city: destinationAddress.city,
        destination_state: destinationAddress.province,
        items: parcelItems,
      })

      if (!response.rates || response.rates.length === 0) {
        // Fallback default amount (in cents: $8.99)
        return {
          calculated_amount: 899,
          is_calculated_price_tax_inclusive: false,
        }
      }

      // Sort by total_charge to find the cheapest rate
      const sortedRates = [...response.rates].sort(
        (a, b) => a.total_charge - b.total_charge
      )

      const optionId = (optionData?.id as string) || ""
      let chosenRate = sortedRates[0] // default to cheapest

      if (optionId.includes("ups") || optionId.includes("ground")) {
        const upsRate = response.rates.find((r) =>
          r.courier_name.toLowerCase().includes("ups")
        )
        if (upsRate) chosenRate = upsRate
      } else if (optionId.includes("fedex")) {
        const fedexRate = response.rates.find((r) =>
          r.courier_name.toLowerCase().includes("fedex")
        )
        if (fedexRate) chosenRate = fedexRate
      } else if (optionId.includes("fastest")) {
        const fastest = [...response.rates].sort(
          (a, b) => a.min_delivery_time - b.min_delivery_time
        )[0]
        if (fastest) chosenRate = fastest
      }

      // Convert from dollars to cents (Medusa integer currency format)
      const amountInCents = Math.round(chosenRate.total_charge * 100)

      return {
        calculated_amount: amountInCents,
        is_calculated_price_tax_inclusive: false,
      }
    } catch (error) {
      console.warn(
        "[fulfillment-easyship] calculatePrice failed, applying fallback rate:",
        error
      )
      return {
        calculated_amount: 899, // $8.99 fallback
        is_calculated_price_tax_inclusive: false,
      }
    }
  }

  /**
   * Purchase shipping label & create shipment with courier
   */
  async createFulfillment(
    data: Record<string, unknown>,
    items: any[],
    order: any,
    fulfillment: any
  ): Promise<CreateFulfillmentResult> {
    const shippingAddress = order?.shipping_address || fulfillment?.shipping_address || {}

    const totalWeightKg = items.reduce(
      (acc, item) => acc + (Number(item.variant?.weight || item.weight || 500) * Number(item.quantity || 1)) / 1000,
      0
    ) || 1.0

    const shipmentResult = await this.client.createShipment({
      origin_address: {
        line_1: this.options.shipFromAddress || "100 Main St",
        city: this.options.shipFromCity || "Exton",
        state: this.options.shipFromState || "PA",
        postal_code: this.options.shipFromZip || "19341",
        country_alpha2: this.options.shipFromCountry || "US",
        contact_name: this.options.shipFromName || "Mithra Whole Foods",
      },
      destination_address: {
        line_1: shippingAddress.address_1 || "123 Customer St",
        line_2: shippingAddress.address_2 || undefined,
        city: shippingAddress.city || "Philadelphia",
        state: shippingAddress.province || "PA",
        postal_code: shippingAddress.postal_code || "19104",
        country_alpha2: shippingAddress.country_code?.toUpperCase() || "US",
        contact_name: `${shippingAddress.first_name || ""} ${shippingAddress.last_name || ""}`.trim() || "Customer",
        contact_phone: shippingAddress.phone,
        contact_email: order?.email,
      },
      parcels: [
        {
          total_actual_weight: totalWeightKg,
          items: items.map((item) => ({
            description: item.title || "Traditional Food Item",
            quantity: item.quantity || 1,
            actual_weight: Number(item.variant?.weight || 500) / 1000,
            declared_currency: "USD",
            declared_customs_value: Number(item.unit_price || 1000) / 100,
          })),
        },
      ],
    })

    const shipment = shipmentResult.shipment

    return {
      data: {
        ...data,
        easyship_shipment_id: shipment.easyship_shipment_id,
        courier_name: shipment.courier?.name || "UPS Ground",
        tracking_number: shipment.tracking_number,
        tracking_url: shipment.tracking_page_url,
        label_url: shipment.label_url,
      },
      labels: shipment.tracking_number
        ? [
            {
              tracking_number: shipment.tracking_number,
              tracking_url:
                shipment.tracking_page_url ||
                `https://www.ups.com/track?tracknum=${shipment.tracking_number}`,
              label_url: shipment.label_url || "",
            },
          ]
        : [],
    }
  }

  /**
   * Cancel shipment / void label
   */
  async cancelFulfillment(fulfillmentData: Record<string, unknown>): Promise<any> {
    const shipmentId = fulfillmentData?.easyship_shipment_id as string
    if (shipmentId) {
      await this.client.cancelShipment(shipmentId)
    }
    return {}
  }

  /**
   * Create return shipment
   */
  async createReturnFulfillment(
    _fulfillment: Record<string, unknown>
  ): Promise<CreateFulfillmentResult> {
    return {
      data: {},
      labels: [],
    }
  }
}
