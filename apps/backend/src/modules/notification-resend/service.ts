import { AbstractNotificationProviderService, MedusaError } from "@medusajs/framework/utils"
import type { Logger, ProviderSendNotificationDTO, ProviderSendNotificationResultsDTO } from "@medusajs/framework/types"
import { renderEmail } from "../../lib/email-templates"

type Options = { api_key: string; from: string }

/**
 * Resend email provider. Talks to the REST API directly (no SDK dependency)
 * and renders templates from src/lib/email-templates.ts.
 */
export class ResendNotificationService extends AbstractNotificationProviderService {
  static identifier = "notification-resend"
  protected options_: Options
  protected logger_: Logger

  constructor({ logger }: { logger: Logger }, options: Options) {
    super()
    this.logger_ = logger
    this.options_ = options
  }

  static validateOptions(options: Record<string, any>) {
    if (!options.api_key) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "RESEND_API_KEY is required")
    }
    if (!options.from) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "RESEND_FROM is required")
    }
  }

  async send(n: ProviderSendNotificationDTO): Promise<ProviderSendNotificationResultsDTO> {
    const rendered = renderEmail(n.template, (n.data ?? {}) as Record<string, any>)
    if (!rendered) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, `Unknown email template "${n.template}"`)
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.options_.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: n.from?.trim() || this.options_.from,
        to: [n.to],
        subject: rendered.subject,
        html: rendered.html,
      }),
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new MedusaError(
        MedusaError.Types.UNEXPECTED_STATE,
        `Resend ${res.status}: ${text.slice(0, 300)}`
      )
    }
    const body = (await res.json().catch(() => ({}))) as { id?: string }
    return { id: body.id }
  }
}
