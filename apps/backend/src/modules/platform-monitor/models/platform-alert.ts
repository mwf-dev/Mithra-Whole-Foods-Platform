import { model } from "@medusajs/framework/utils"

/**
 * A raised condition — a projected overage, or a provider that stopped
 * answering.
 *
 * Alerts are persisted rather than recomputed-and-emailed because two things
 * need memory: the dashboard has to show what is currently wrong (`resolved_at`
 * null), and the notifier has to avoid emailing the same warning every time the
 * collector runs (`notified_at`). A condition that clears sets `resolved_at`
 * instead of deleting the row, so the history of what went wrong survives.
 *
 * `fingerprint` is what makes a condition "the same one" across runs:
 * `<provider>:<metric_key>:<severity>`.
 */
export const PlatformAlert = model
  .define("platform_alert", {
    id: model.id().primaryKey(),
    fingerprint: model.text(),
    provider: model.text(),
    metric_key: model.text(),
    /** "warning" — projected to breach. "critical" — already breached, or provider down. */
    severity: model.enum(["warning", "critical"]).default("warning"),
    message: model.text(),
    /** Snapshot of the numbers that triggered it, for the alert detail view. */
    context: model.json().default({}),
    triggered_at: model.dateTime(),
    /** Last time the condition was still true — lets the UI show "ongoing since". */
    last_seen_at: model.dateTime(),
    resolved_at: model.dateTime().nullable(),
    /** Set once an email/Slack message went out. Gates re-notification. */
    notified_at: model.dateTime().nullable(),
    /** Operator silenced it; still listed, no longer notifies. */
    acknowledged_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["fingerprint"] },
    { on: ["provider", "resolved_at"] },
  ])
