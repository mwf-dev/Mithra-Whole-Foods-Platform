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
    product_handle: model.text().nullable(),
    product_title: model.text().nullable(),
    status: model
      .enum(["draft", "submitted", "approved"])
      .default("draft"),
    summary: model.json().nullable(),
    slides: model.json().nullable(),
    submitted_at: model.dateTime().nullable(),
    // Free-text "who filled this in" — the studio has no accounts, so this is
    // the only attribution available. Never treated as identity.
    updated_by: model.text().nullable(),
  })
  .indexes([
    // One brief per product. Enforced here rather than only in the route:
    // autosave means two tabs can race a check-then-insert.
    { on: ["product_id"], unique: true },
  ])
