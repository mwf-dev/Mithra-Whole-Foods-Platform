import { MedusaContainer } from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createCollectionsWorkflow,
  createProductCategoriesWorkflow,
  createProductOptionsWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seed_products({
  container,
}: {
  container: MedusaContainer;
}) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // Get default sales channel to assign to products
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
  });
  const defaultSalesChannel = salesChannels[0];

  // Get shipping profile to assign to products
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfiles[0];

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
          values: ["500g", "1kg", "1L"],
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
              url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/coffee-mug.png",
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
              title: "1L",
              sku: "OIL-GROUNDNUT-1L",
              options: {
                Weight: "1L"
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
}
