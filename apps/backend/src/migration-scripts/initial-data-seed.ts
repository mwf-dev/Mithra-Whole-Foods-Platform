import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ModuleRegistrationName,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createApiKeysWorkflow,
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createSalesChannelsWorkflow,
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  createStoresWorkflow,
  createTaxRegionsWorkflow,
  linkSalesChannelsToApiKeyWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function initial_data_seed({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(
    ModuleRegistrationName.FULFILLMENT
  );

  // Idempotency guard: this seed creates store/region/collection/products
  // unconditionally, so re-running it on a seeded database duplicates the
  // entire catalog (including the homepage-best-sellers collection handle,
  // which silently swaps the homepage product rail). Abort if any prior
  // seed marker exists.
  const { data: existingCollections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
    filters: { handle: "homepage-best-sellers" },
  });
  const { data: existingChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
    filters: { name: "Default Sales Channel" },
  });
  if (existingCollections.length > 0 || existingChannels.length > 0) {
    logger.warn(
      "Seed skipped: database already contains seeded data " +
        "(found existing 'homepage-best-sellers' collection or 'Default Sales Channel'). " +
        "Re-running the seed would duplicate the catalog."
    );
    return;
  }

  const countries = ["in", "us", "gb"];

  logger.info("Seeding store data...");
  const {
    result: [defaultSalesChannel],
  } = await createSalesChannelsWorkflow(container).run({
    input: {
      salesChannelsData: [
        {
          name: "Default Sales Channel",
          description: "Created by Medusa",
        },
      ],
    },
  });

  const {
    result: [publishableApiKey],
  } = await createApiKeysWorkflow(container).run({
    input: {
      api_keys: [
        {
          title: "Default Publishable API Key",
          type: "publishable",
          created_by: "",
        },
      ],
    },
  });

  await linkSalesChannelsToApiKeyWorkflow(container).run({
    input: {
      id: publishableApiKey.id,
      add: [defaultSalesChannel.id],
    },
  });

  const {
    result: [store],
  } = await createStoresWorkflow(container).run({
    input: {
      stores: [
        {
          name: "Mithra Whole Foods",
          supported_currencies: [
            {
              currency_code: "inr",
              is_default: true,
            },
            {
              currency_code: "usd",
              is_default: false,
            },
          ],
          default_sales_channel_id: defaultSalesChannel.id,
        },
      ],
    },
  });

  logger.info("Seeding region data...");
  const { result: regionResult } = await createRegionsWorkflow(container).run({
    input: {
      regions: [
        {
          name: "India",
          currency_code: "inr",
          countries: ["in"],
          payment_providers: ["pp_system_default"],
        },
      ],
    },
  });
  const region = regionResult[0];
  logger.info("Finished seeding regions.");

  logger.info("Seeding tax regions...");
  await createTaxRegionsWorkflow(container).run({
    input: countries.map((country_code) => ({
      country_code,
      provider_id: "tp_system",
    })),
  });
  logger.info("Finished seeding tax regions.");

  logger.info("Seeding stock location data...");
  const { result: stockLocationResult } = await createStockLocationsWorkflow(
    container
  ).run({
    input: {
      locations: [
        {
          name: "Main Warehouse",
          address: {
            city: "Chennai",
            country_code: "IN",
            address_1: "",
          },
        },
      ],
    },
  });
  const stockLocation = stockLocationResult[0];

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_provider_id: "manual_manual",
    },
  });

  logger.info("Seeding fulfillment data...");
  // This is created by a migration script in core.
  const { data: shippingProfileResult } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfileResult[0];

  const fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
    name: "India Delivery",
    type: "shipping",
    service_zones: [
      {
        name: "India",
        geo_zones: [
          {
            country_code: "in",
            type: "country",
          }
        ],
      },
    ],
  });

  await link.create({
    [Modules.STOCK_LOCATION]: {
      stock_location_id: stockLocation.id,
    },
    [Modules.FULFILLMENT]: {
      fulfillment_set_id: fulfillmentSet.id,
    },
  });

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standard Shipping",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standard",
          description: "Ship in 2-3 days.",
          code: "standard",
        },
        prices: [
          {
            currency_code: "inr",
            amount: 50,
          },
          {
            region_id: region.id,
            amount: 50,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      }
    ],
  });
  logger.info("Finished seeding fulfillment data.");

  await linkSalesChannelsToStockLocationWorkflow(container).run({
    input: {
      id: stockLocation.id,
      add: [defaultSalesChannel.id],
    },
  });
  logger.info("Finished seeding stock location data.");

  logger.info("Seeding collections data...");
  const { result: collectionsResult } = await createCollectionsWorkflow(container).run({
    input: {
      collections: [
        {
          title: "Homepage - Best Sellers",
          handle: "homepage-best-sellers",
        }
      ]
    }
  });
  const bestSellersCollection = collectionsResult[0];

  logger.info("Seeding product data...");

  const { result: categoryResult } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        {
          name: "Millets",
          is_active: true,
        },
        {
          name: "Cold Pressed Oils",
          is_active: true,
        },
        {
          name: "Spices",
          is_active: true,
        }
      ],
    },
  });

  const { result: productOptionsResult } = await createProductOptionsWorkflow(
    container
  ).run({
    input: {
      product_options: [
        {
          title: "Weight",
          values: ["500g", "1kg"],
        }
      ],
    },
  });
  const weightOption = productOptionsResult.find((o) => o.title === "Weight")!;

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Organic Barnyard Millet",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Millets")!.id,
          ],
          collection_id: bestSellersCollection.id,
          description:
            "Premium quality organic Barnyard Millet, rich in dietary fiber and low in glycemic index.",
          handle: "organic-barnyard-millet",
          weight: 1000,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/coffee-mug.png", // using placeholder image for now
            }
          ],
          options: [
            { id: weightOption.id }
          ],
          variants: [
            {
              title: "500g",
              sku: "MILLET-BARNYARD-500G",
              options: {
                Weight: "500g"
              },
              prices: [
                {
                  amount: 120,
                  currency_code: "inr",
                }
              ],
            },
            {
              title: "1kg",
              sku: "MILLET-BARNYARD-1KG",
              options: {
                Weight: "1kg"
              },
              prices: [
                {
                  amount: 220,
                  currency_code: "inr",
                }
              ],
            }
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
        },
        {
          title: "Wood Pressed Groundnut Oil",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Cold Pressed Oils")!.id,
          ],
          collection_id: bestSellersCollection.id,
          description:
            "100% pure and natural wood pressed groundnut oil. Extracted without heating to retain nutrients.",
          handle: "wood-pressed-groundnut-oil",
          weight: 1000,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/coffee-mug.png",
            }
          ],
          options: [{ id: weightOption.id }],
          variants: [
            {
              title: "1L", // we can just use 1kg equivalent for simplicity in the option
              sku: "OIL-GROUNDNUT-1L",
              options: {
                Weight: "1kg"
              },
              prices: [
                {
                  amount: 350,
                  currency_code: "inr",
                }
              ],
            }
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
        },
        {
          title: "Organic Turmeric Powder",
          category_ids: [
            categoryResult.find((cat) => cat.name === "Spices")!.id,
          ],
          collection_id: bestSellersCollection.id,
          description:
            "Pure, aromatic turmeric powder with high curcumin content.",
          handle: "organic-turmeric-powder",
          weight: 500,
          status: ProductStatus.PUBLISHED,
          shipping_profile_id: shippingProfile.id,
          images: [
            {
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/coffee-mug.png",
            }
          ],
          options: [{ id: weightOption.id }],
          variants: [
            {
              title: "500g",
              sku: "SPICE-TURMERIC-500G",
              options: {
                Weight: "500g"
              },
              prices: [
                {
                  amount: 180,
                  currency_code: "inr",
                }
              ],
            }
          ],
          sales_channels: [
            {
              id: defaultSalesChannel.id,
            },
          ],
        }
      ],
    },
  });
  logger.info("Finished seeding product data.");

  logger.info("Seeding inventory levels.");

  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  });

  await createInventoryLevelsWorkflow(container).run({
    input: {
      inventory_levels: inventoryItems.map((item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 1000,
        inventory_item_id: item.id,
      })),
    },
  });

  logger.info("Finished seeding inventory levels data.");
}
