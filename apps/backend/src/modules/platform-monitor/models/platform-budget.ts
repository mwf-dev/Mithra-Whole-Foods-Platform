import { model } from "@medusajs/framework/utils"

/**
 * An operator-set ceiling for one metric.
 *
 * Providers report their own plan limits where they can (Cloudinary returns
 * `limit` on every counter), but most do not — and even when they do, the limit
 * we care about is often lower than the plan's: "tell me before we leave the
 * free tier" is a different number from "tell me when the API stops working".
 * A budget row overrides whatever the provider reported.
 *
 * `threshold_pct` is applied to the *projected end-of-cycle* value, not the
 * current one — the point is to warn while there is still time to act.
 */
export const PlatformBudget = model
  .define("platform_budget", {
    id: model.id().primaryKey(),
    provider: model.text(),
    /** Metric key, e.g. "bandwidth_gb". Matches `Metric.key`. */
    metric_key: model.text(),
    /** Ceiling in the metric's own unit. */
    limit_value: model.number(),
    /** Percentage of `limit_value` at which to alert. */
    threshold_pct: model.number().default(90),
    enabled: model.boolean().default(true),
    note: model.text().nullable(),
  })
  .indexes([{ on: ["provider", "metric_key"], unique: true }])
