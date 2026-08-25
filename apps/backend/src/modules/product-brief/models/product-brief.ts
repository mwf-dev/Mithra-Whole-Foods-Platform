import { model } from "@medusajs/framework/utils"

/**
 * One content brief per catalog product — the client-facing intake behind the
 * Content Studio (src/api/content-studio/).
 *
 * `slides` is JSON rather than a child table on purpose: the client names and
 * orders their own slides ("Thumbnail", "Benefits", "How To Use", …), adds and
 * removes them freely, and nothing else in the system queries *inside* a slide.
 * A relational child table would buy ordering + referential integrity we don't
 * need and cost a migration every time the slide shape gains a field.
 *
 * Shape of `slides` (normalised on write by normalizeSlides() in
 * src/lib/content-studio.ts — never trust the client to send this exactly):
 *   [{
 *     id:      string,               // client-generated, stable across saves
 *     name:    string,               // "Benefits Slide" — free text
 *     content: string,               // the copy the client wants on the slide
 *     notes:   string,               // direction: mood, colours, what to avoid
 *     links:   string[],             // reference URLs ("make it look like this")
 *     images:  [{ url, key, filename }]   // uploaded via the file module
 *   }]
 *
 * `summary` holds the product-level fields that aren't tied to one slide:
 *   { tagline, sub_claim, notes, links: string[], contact: string }
 *
 * Denormalised `product_handle` / `product_title` exist so the admin review
 * list and the YAML export can render without a join into the product module.
 * They're refreshed on every save, so a renamed product self-heals.
 */
export const ProductBrief = model
  .define("product_brief", {
    id: model.id().primaryKey(),
    product_id: model.text(),
    // "catalog" = a product that exists in Medusa; "client" = one the client
    // proposed from scratch in the studio, whose product_id is a synthetic
    // `new_…` key (isClientProductId() in src/lib/content-studio.ts) because
    // no Medusa product exists for it yet.
    origin: model.enum(["catalog", "client"]).default("catalog"),
    product_handle: model.text().nullable(),
    product_title: model.text().nullable(),
    status: model
      .enum(["draft", "submitted", "approved"])
      .default("draft"),
    summary: model.json().nullable(),
    slides: model.json().nullable(),
    submitted_at: model.dateTime().nullable(),
    // Set when the client removes a product in the studio. Removal here NEVER
    // touches the catalog — it moves the card into "Removed products" so the
    // operator can decide what to do with the real product later. Restoring is
    // just clearing this back to null, so nothing the client wrote is lost.
    archived_at: model.dateTime().nullable(),
    archive_reason: model.text().nullable(),
    archived_by: model.text().nullable(),
    // Only for origin === "client": the product itself as the client describes
    // it (name, pack size, price, description, ingredients, photos). See
    // normalizeProposal() for the shape.
    proposal: model.json().nullable(),
    // Free-text "who filled this in" — the studio has no accounts, so this is
    // the only attribution available. Never treated as identity.
    updated_by: model.text().nullable(),
  })
  .indexes([
    // One brief per product. Enforced here rather than only in the route:
    // autosave means two tabs can race a check-then-insert.
    { on: ["product_id"], unique: true },
  ])
