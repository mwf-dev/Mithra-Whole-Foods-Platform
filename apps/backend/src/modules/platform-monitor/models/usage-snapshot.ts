import { model } from "@medusajs/framework/utils"

/**
 * A point-in-time reading of one provider's usage.
 *
 * Stored as whole snapshots rather than one row per metric because the run-rate
 * maths needs every metric to share the same `captured_at` and billing cycle —
 * splitting them invites comparing a Monday storage figure against a Friday
 * bandwidth figure.
 *
 * Rows are small (a few hundred bytes) and written at most a handful of times a
 * day, so a year of history is well under a megabyte. `collect-platform-usage`
 * prunes anything older than the retention window anyway.
 */
export const UsageSnapshot = model
  .define("platform_usage_snapshot", {
    id: model.id().primaryKey(),
    provider: model.text(),
    captured_at: model.dateTime(),
    /** Provider billing cycle this reading belongs to (ISO strings, nullable). */
    cycle_start: model.dateTime().nullable(),
    cycle_end: model.dateTime().nullable(),
    /**
     * Normalised `Metric[]` — see `src/lib/platform-monitor/types.ts`. Nullable
     * rather than defaulted: `model.json().default()` only accepts an object
     * default, not an array, so callers treat null the same as an empty list.
     */
    metrics: model.json().nullable(),
    /** Provider's own cost figure for the cycle, when it exposes one. */
    cost_estimate_usd: model.number().nullable(),
    /** "ok" when the fetch succeeded, "error" when it did not. */
    status: model.text().default("ok"),
    error: model.text().nullable(),
  })
  .indexes([
    // The only read pattern: newest-first history for one provider.
    { on: ["provider", "captured_at"] },
  ])
