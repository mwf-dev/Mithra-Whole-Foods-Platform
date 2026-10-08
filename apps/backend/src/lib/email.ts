import type { EmailTemplate } from "./email-templates"

/**
 * Which `template` value to hand the notification module.
 * Resend renders by name from src/lib/email-templates.ts; SendGrid needs a
 * dynamic-template id from the env var, and no id means "skip".
 */
/** Public tracking page link for an order number (guests use it with their phone). */
export function trackUrl(orderNumber: string): string {
  const base = (process.env.STOREFRONT_URL || "http://localhost:8000").replace(/\/$/, "")
  return `${base}/us/track?order=${encodeURIComponent(orderNumber.replace(/^#/, ""))}`
}

export function resolveTemplate(
  name: EmailTemplate,
  sendgridEnvVar: string
): string | undefined {
  if (process.env.RESEND_API_KEY) return name
  return process.env[sendgridEnvVar] || undefined
}
