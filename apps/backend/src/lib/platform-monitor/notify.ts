import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { PLATFORM_MONITOR_MODULE } from "../../modules/platform-monitor"
import { apiRequest } from "./http"
import { pendingNotifications } from "./collector"

/**
 * Alert delivery: Slack webhook and/or email.
 *
 * Both channels are optional and independent. That is not laziness — this
 * project ships with `SENDGRID_API_KEY` unset, which means the notification
 * module is not registered at all and every email path silently no-ops. An
 * alerting system whose only channel is the one known to be switched off is
 * decorative. The Slack webhook needs no vendor account beyond Slack itself and
 * is the recommended primary channel; email is the fallback for when SendGrid
 * is eventually wired up.
 *
 * Alerts are batched into one digest per run rather than one message per alert:
 * a provider going down typically trips several metrics at once, and eight
 * separate messages is how people start ignoring the channel.
 *
 * Nothing here is allowed to throw into the collector — see the caller. What it
 * *does* guarantee is that `notified_at` is only stamped on alerts that were
 * actually delivered, so a failed send retries on the next run instead of being
 * swallowed.
 */

const SEVERITY_EMOJI: Record<string, string> = {
  critical: "🔴",
  warning: "🟠",
}

export async function sendAlertDigest(container: any): Promise<{
  sent: boolean
  channels: string[]
  alert_count: number
}> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const svc = container.resolve(PLATFORM_MONITOR_MODULE)

  const alerts = await pendingNotifications(container)
  if (!alerts.length) {
    return { sent: false, channels: [], alert_count: 0 }
  }

  const channels: string[] = []

  if (await sendSlack(alerts)) {
    channels.push("slack")
  }
  if (await sendEmail(container, alerts)) {
    channels.push("email")
  }

  if (!channels.length) {
    // Deliberately a warning, not silence: "we had 3 alerts and no way to tell
    // anyone" is itself the thing an operator needs to know.
    logger.warn(
      `[platform-monitor] ${alerts.length} alert(s) pending but no channel is configured ` +
        "(set PLATFORM_ALERT_SLACK_WEBHOOK or SENDGRID_API_KEY + PLATFORM_ALERT_EMAIL)"
    )
    return { sent: false, channels: [], alert_count: alerts.length }
  }

  const now = new Date()
  for (const alert of alerts) {
    await svc.updatePlatformAlerts({ id: alert.id, notified_at: now })
  }

  logger.info(
    `[platform-monitor] notified ${alerts.length} alert(s) via ${channels.join(", ")}`
  )

  return { sent: true, channels, alert_count: alerts.length }
}

async function sendSlack(alerts: any[]): Promise<boolean> {
  const webhook = process.env.PLATFORM_ALERT_SLACK_WEBHOOK
  if (!webhook) {
    return false
  }

  const lines = alerts.map(
    (a) => `${SEVERITY_EMOJI[a.severity] ?? "•"} ${a.message}`
  )

  const res = await apiRequest(webhook, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      text: `*Mithra infrastructure — ${alerts.length} alert(s)*\n${lines.join("\n")}`,
    }),
  })

  // Slack webhooks answer with the plain string "ok", not JSON — `apiRequest`
  // records that as a parse miss but still reports ok:true on a 200.
  return res.ok
}

async function sendEmail(container: any, alerts: any[]): Promise<boolean> {
  const to = process.env.PLATFORM_ALERT_EMAIL || process.env.ADMIN_NOTIFICATION_EMAIL
  if (!to || !process.env.SENDGRID_API_KEY) {
    return false
  }

  let notification: any
  try {
    notification = container.resolve(Modules.NOTIFICATION)
  } catch {
    // Module not registered — the SENDGRID_API_KEY check above should have
    // caught this, but config can disagree with env in a worker process.
    return false
  }

  const body = alerts
    .map((a) => `${a.severity.toUpperCase()}: ${a.message}`)
    .join("\n")

  const templateId = process.env.SENDGRID_PLATFORM_ALERT_TEMPLATE_ID

  await notification.createNotifications({
    to,
    channel: "email",
    // Without a dynamic template id SendGrid needs a plain-text send; with one
    // it renders `data`. Both shapes are supported so this works before anyone
    // builds a template.
    template: templateId || "platform-alert",
    data: {
      subject: `Mithra infrastructure: ${alerts.length} alert(s)`,
      alert_count: alerts.length,
      alerts: alerts.map((a) => ({
        severity: a.severity,
        provider: a.provider,
        metric: a.metric_key,
        message: a.message,
      })),
      body,
    },
  })

  return true
}
