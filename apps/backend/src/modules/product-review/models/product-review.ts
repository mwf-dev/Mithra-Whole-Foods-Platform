import { model } from "@medusajs/framework/utils"

/**
 * A customer's review of a product.
 *
 * Reviews are held back until an admin approves them: signup is free, so
 * anything auto-published is spam-and-abuse surface on a public product page.
 * `status` is what the storefront filters on — it never reads pending rows.
 *
 * `verified_purchase` is resolved once, when the review is written, by checking
 * the customer's order history. It is stored rather than computed on read so a
 * later refund or order edit can't silently retract the badge on an honest
 * review, and so listing reviews stays a single query.
 */
export const ProductReview = model
  .define("product_review", {
    id: model.id().primaryKey(),
    product_id: model.text(),
    customer_id: model.text(),
    // Denormalised: reviews outlive account edits, and the storefront should
    // not have to join to the customer module just to render a byline.
    customer_name: model.text(),
    rating: model.number(),
    title: model.text().nullable(),
    content: model.text(),
    status: model.enum(["pending", "approved", "rejected"]).default("pending"),
    verified_purchase: model.boolean().default(false),
  })
  .indexes([
    // The storefront's hot path: approved reviews for one product.
    { on: ["product_id", "status"] },
    // Enforces one review per customer per product at the database, not just
    // in the route — two concurrent submits would otherwise both pass a
    // check-then-insert.
    { on: ["product_id", "customer_id"], unique: true },
  ])
