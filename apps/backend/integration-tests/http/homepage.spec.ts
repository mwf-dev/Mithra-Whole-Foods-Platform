import { medusaIntegrationTestRunner } from "@medusajs/test-utils"

jest.setTimeout(60 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api }) => {
    describe("GET /homepage (public storefront CMS endpoint)", () => {
      it("returns 200 with a homepage_settings envelope key", async () => {
        const response = await api.get("/homepage")

        expect(response.status).toEqual(200)
        // Deliberately keyless/public (see src/api/homepage/route.ts) and always
        // returns the { homepage_settings } envelope — null on a fresh DB.
        expect(response.data).toHaveProperty("homepage_settings")
      })

      it("is reachable without a publishable API key (unlike /store/*)", async () => {
        // No x-publishable-api-key header supplied on purpose.
        const response = await api.get("/homepage")
        expect(response.status).toEqual(200)
      })
    })
  },
})
