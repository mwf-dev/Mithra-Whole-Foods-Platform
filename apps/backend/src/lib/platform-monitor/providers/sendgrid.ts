import { apiGet } from "../http"
import type { PlatformProvider, Metric, UsageResult } from "../types"
import { currentMonthCycle } from "./vercel"

/**
 * SendGrid — transactional email (order confirmations, shipment notices).
 *
 * The check that matters most is not a quota: it is whether email is *wired at
 * all*. Without `SENDGRID_API_KEY` the notification module is never registered
 * in `medusa-config.ts`, so the `order-placed` and `shipment-created`
 * subscribers run and silently no-op. Nothing errors, nothing logs at error
 * level, and the first symptom is a customer asking where their confirmation
 * went. `module_registered` below makes that state visible.
 *
 * Delivery stats come from `/v3/stats`, which aggregates by day. A spike in
 * bounces or drops is the second failure mode worth catching early — a bounced
 * confirmation looks identical to a missing one from the customer's side.
 */

const API = "https://api.sendgrid.com/v3"

const sendgrid: PlatformProvider = {
  id: "sendgrid",
  label: "SendGrid",
  category: "email",
  docs_url: "https://www.twilio.com/docs/sendgrid/api-reference/stats",
  setup_hint:
    "SendGrid → Settings → API Keys → Restricted Access with 'Stats: Read'. Falls back to the backend's SENDGRID_API_KEY.",
  credential_fields: [
    {
      key: "api_key",
      label: "API key",
      type: "password",
      required: true,
      placeholder: "SG.…",
      env: "SENDGRID_API_KEY",
    },
  ],
  setting_fields: [],

  async test({ credentials }) {
    const key = credentials.api_key
    if (!key) {
      return {
        ok: false,
        detail:
          "No API key configured — order confirmation emails are not being sent",
      }
    }

    const res = await apiGet<{ scopes?: string[] }>(`${API}/scopes`, {
      headers: { authorization: `Bearer ${key}` },
    })

    if (!res.ok) {
      return { ok: false, detail: `Rejected: ${res.error}`, latency_ms: res.latency_ms }
    }

    const scopes = res.data?.scopes ?? []
    const canReadStats = scopes.some((s) => s.startsWith("stats"))

    return {
      ok: true,
      detail: canReadStats
        ? `Connected (${scopes.length} scopes)`
        : `Connected, but the key has no 'stats' scope — delivery numbers will be unavailable`,
      latency_ms: res.latency_ms,
    }
  },

  async usage({ credentials }): Promise<UsageResult> {
    const key = credentials.api_key
    const cycle = currentMonthCycle()
    const warnings: string[] = []

    // True iff medusa-config.ts actually registered the notification module.
    // Checked against the same env var the config reads, not the credential
    // entered here — a token typed into this dashboard does not make the
    // running process able to send mail.
    const moduleRegistered = Boolean(process.env.SENDGRID_API_KEY)
    const metrics: Metric[] = [
      {
        key: "module_registered",
        label: "Email sending wired up",
        value: moduleRegistered ? 1 : 0,
        unit: "count",
        cumulative: false,
        note: moduleRegistered
          ? "SENDGRID_API_KEY is set on the backend — subscribers can send"
          : "SENDGRID_API_KEY is UNSET on the backend — order/shipment emails silently no-op",
        alert_when: {
          below: 1,
          severity: "critical",
          reason:
            "SENDGRID_API_KEY is unset on the backend — order confirmation and shipment emails are silently not being sent to customers",
        },
      },
    ]

    if (!moduleRegistered) {
      warnings.push(
        "SENDGRID_API_KEY is not set on the backend process: transactional emails are not being sent."
      )
    }

    if (!key) {
      return {
        cycle_start: cycle.start,
        cycle_end: cycle.end,
        metrics,
        cost_estimate_usd: null,
        warnings,
      }
    }

    const startDate = cycle.start.slice(0, 10)
    const stats = await apiGet<
      { stats?: { metrics?: Record<string, number> }[] }[]
    >(`${API}/stats?start_date=${startDate}&aggregated_by=day`, {
      headers: { authorization: `Bearer ${key}` },
    })

    if (stats.ok && Array.isArray(stats.data)) {
      const totals = { requests: 0, delivered: 0, bounces: 0, blocks: 0, spam_reports: 0 }
      for (const day of stats.data) {
        for (const bucket of day.stats ?? []) {
          const m = bucket.metrics ?? {}
          totals.requests += m.requests ?? 0
          totals.delivered += m.delivered ?? 0
          totals.bounces += m.bounces ?? 0
          totals.blocks += m.blocks ?? 0
          totals.spam_reports += m.spam_reports ?? 0
        }
      }

      metrics.push(
        {
          key: "emails_sent",
          label: "Emails requested (cycle)",
          value: totals.requests,
          unit: "count",
          cumulative: true,
        },
        {
          key: "emails_delivered",
          label: "Delivered (cycle)",
          value: totals.delivered,
          unit: "count",
          cumulative: true,
        },
        {
          key: "emails_failed",
          label: "Bounced / blocked / spam (cycle)",
          value: totals.bounces + totals.blocks + totals.spam_reports,
          unit: "count",
          cumulative: true,
        }
      )
    } else {
      warnings.push(`Delivery stats unavailable: ${stats.error ?? "unexpected shape"}`)
    }

    return {
      cycle_start: cycle.start,
      cycle_end: cycle.end,
      metrics,
      cost_estimate_usd: null,
      warnings,
    }
  },
}

export default sendgrid
