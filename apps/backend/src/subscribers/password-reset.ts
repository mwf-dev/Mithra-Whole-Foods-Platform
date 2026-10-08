import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { resolveTemplate } from "../lib/email"

/**
 * Medusa emits `auth.password_reset` from POST /auth/{actor}/emailpass/reset-password.
 * The event carries a short-lived token; the email links to the right app:
 * customers → storefront /reset-password, admin users → the Medusa admin.
 * Always responds 201 to the caller regardless of whether the email exists, so
 * this subscriber is the only place that can send (or silently skip).
 */
export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<{ entity_id: string; actor_type: string; token: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)

  let notifications: any
  try {
    notifications = container.resolve(Modules.NOTIFICATION)
  } catch {
    logger.warn("[password-reset] notification module not configured; reset email not sent")
    return
  }

  const template = resolveTemplate("password-reset", "SENDGRID_PASSWORD_RESET_TEMPLATE_ID")
  if (!template) {
    logger.warn("[password-reset] no email template configured; reset email not sent")
    return
  }

  const storefront = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")
  const backend = (process.env.BACKEND_PUBLIC_URL || process.env.MEDUSA_BACKEND_URL || "").replace(/\/$/, "")
  const token = encodeURIComponent(data.token)
  const email = encodeURIComponent(data.entity_id)

  const resetUrl =
    data.actor_type === "customer"
      ? `${storefront}/us/reset-password?token=${token}&email=${email}`
      : `${backend}/app/reset-password?token=${token}&email=${email}`

  try {
    await notifications.createNotifications({
      to: data.entity_id,
      channel: "email",
      template,
      data: { reset_url: resetUrl },
    })
  } catch (e) {
    logger.error("[password-reset] reset email failed", e as Error)
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
}
