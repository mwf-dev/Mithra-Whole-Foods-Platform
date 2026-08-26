import { EasyshipClient } from "../services/easyship-client"
import { EasyshipFulfillmentService } from "../services/easyship-fulfillment"

describe("EasyshipFulfillmentService", () => {
  let service: EasyshipFulfillmentService

  beforeEach(() => {
    service = new EasyshipFulfillmentService({}, {
      apiKey: "mock",
      shipFromZip: "19341",
      shipFromCity: "Exton",
      shipFromState: "PA",
      shipFromCountry: "US",
    })
  })

  it("advertises multi-carrier fulfillment options", async () => {
    const options = await service.getFulfillmentOptions()
    expect(options).toHaveLength(5)
    expect(options.map((o) => o.id)).toContain("easyship-cheapest")
    expect(options.map((o) => o.id)).toContain("easyship-ups-ground")
    expect(options.map((o) => o.id)).toContain("easyship-fedex-ground")
  })

  it("indicates price calculation is supported", async () => {
    const canCalculate = await service.canCalculate()
    expect(canCalculate).toBe(true)
  })

  it("calculates dynamic multi-carrier shipping rate in cents", async () => {
    const context = {
      shipping_address: {
        postal_code: "90210",
        country_code: "US",
        city: "Beverly Hills",
        province: "CA",
      },
      items: [
        {
          title: "Sastra Pure Cow Ghee",
          weight: 1000,
          quantity: 2,
          unit_price: 1899,
        },
      ],
    } as any

    const result = await service.calculatePrice(
      { id: "easyship-cheapest" },
      {},
      context
    )

    expect(result).toHaveProperty("calculated_amount")
    expect(typeof result.calculated_amount).toBe("number")
    expect(result.calculated_amount).toBeGreaterThan(0)
    expect(result.is_calculated_price_tax_inclusive).toBe(false)
  })

  it("creates fulfillment and returns tracking number and label url", async () => {
    const order = {
      email: "shopper@example.com",
      shipping_address: {
        first_name: "Jane",
        last_name: "Doe",
        address_1: "123 Market St",
        city: "Philadelphia",
        province: "PA",
        postal_code: "19104",
        country_code: "US",
      },
    }
    const items = [
      {
        title: "Cold Pressed Sesame Oil",
        quantity: 1,
        weight: 1000,
        unit_price: 1599,
      },
    ]

    const result = await service.createFulfillment({}, items, order, {})

    expect(result.data).toHaveProperty("easyship_shipment_id")
    expect(result.labels).toHaveLength(1)
    expect(result.labels[0].tracking_number).toMatch(/^1Z/)
    expect(result.labels[0].tracking_url).toContain("track")
  })
})

describe("EasyshipClient", () => {
  it("provides reliable mock fallback when unconfigured", async () => {
    const client = new EasyshipClient({ apiKey: "mock" })
    expect(client.isConfigured).toBe(false)

    const rates = await client.getRates({
      origin_postal_code: "19341",
      origin_country_alpha2: "US",
      destination_postal_code: "10001",
      destination_country_alpha2: "US",
      items: [{ actual_weight: 1.5 }],
    })

    expect(rates.rates.length).toBeGreaterThanOrEqual(3)
    const couriers = rates.rates.map((r) => r.courier_name)
    expect(couriers.some((c) => c.includes("UPS"))).toBe(true)
    expect(couriers.some((c) => c.includes("USPS"))).toBe(true)
  })
})
