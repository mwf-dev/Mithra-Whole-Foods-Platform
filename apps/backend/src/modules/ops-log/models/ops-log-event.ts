import { model } from "@medusajs/framework/utils"

/**
 * One row per operation we want to be able to see and retry from the admin:
 * an email send (ok or failed), an Easyship webhook event we received, or a
 * shipping-label purchase/void. The `payload` column carries exactly what is
 * needed to replay the operation from the retry endpoint:
 *   email   → { to, template, data }
 *   webhook → the parsed Easyship event { eventType, trackingNumber, … }
 *   label   → what was bought (shipment id, tracking number) or what failed
 *
 * Never read by the storefront; admin-only. Rows are cheap but still bounded —
 * a housekeeping prune keeps the last 90 days (see the list route comment).
 */
export const OpsLogEvent = model
  .define("ops_log_event", {
    kind: model.enum(["email", "webhook", "label"]),
    // "easyship" | "stripe" | "resend" | "admin" | "system" — free text so a
    // new integration can report without a migration.
    source: model.text(),
    status: model.enum(["ok", "failed"]),
    order_id: model.text().nullable(),
    email: model.text().nullable(),
    // Template name, tracking number, Easyship shipment id — whatever is the
    // most useful one-line identity of the item this row is about.
    reference: model.text().nullable(),
    detail: model.text().nullable(),
    payload: model.json().nullable(),
    retried_at: model.dateTime().nullable(),
  })
  .indexes([
    // The list route reads newest-first, optionally filtered by kind/status.
    { on: ["created_at"] },
    { on: ["status"] },
    { on: ["order_id"] },
  ])
