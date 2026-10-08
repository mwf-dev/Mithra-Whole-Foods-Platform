import type { EmailTemplate } from "./email-templates"

/**
 * Which `template` value to hand the notification module.
 * Resend renders by name from src/lib/email-templates.ts; SendGrid needs a
 * dynamic-template id from the env var, and no id means "skip".
 */
export function resolveTemplate(
  name: EmailTemplate,
  sendgridEnvVar: string
): string | undefined {
  if (process.env.RESEND_API_KEY) return name
  return process.env[sendgridEnvVar] || undefined
}
