import { apiGet, round } from "../http"
import type { PlatformProvider, Metric, UsageResult } from "../types"
import { currentMonthCycle } from "./vercel"

/**
 * Stripe — payments.
 *
 * Not a "usage limit" service, so the metrics here are operational rather than
 * quota-driven: is the key live or test, are charges succeeding, and — the one
 * this project specifically needs — **is a webhook endpoint registered and is
 * its signing secret configured on our side**.
 *
 * That last check exists because of a known, documented gap: the backend runs
 * with `STRIPE_WEBHOOK_SECRET` unset, so `/hooks/payment/stripe_stripe` accepts
 * unverified webhook payloads. It is invisible from every dashboard involved —
 * Stripe shows a healthy endpoint, Medusa shows no error. Surfacing it as a
 * failing check here is the point of the portal.
 *
 * The key used is the backend's own `STRIPE_API_KEY` by default. It is a secret
 * key, so restrict it if you enter a separate one: a read-only restricted key
 * with Charges + Webhook Endpoints read access is enough.
 */

const API = "https://api.stripe.com/v1"

function headers(key: string): Record<string, string> {
  return { authorization: `Bearer ${key}` }
}

const stripe: PlatformProvider = {
  id: "stripe",
  label: "Stripe",
  category: "payments",
  docs_url: "https://stripe.com/docs/keys#limit-access",
  setup_hint:
    "Stripe → Developers → API keys → Create restricted key with read access to Charges and Webhook Endpoints. Falls back to the backend's STRIPE_API_KEY.",
  credential_fields: [
    {
      key: "secret_key",
      label: "Secret / restricted key",
      type: "password",
      required: true,
      placeholder: "rk_live_… or sk_…",
      env: "STRIPE_API_KEY",
    },
  ],
  setting_fields: [],

  async test({ credentials }) {
    const key = credentials.secret_key
    if (!key) {
      return { ok: false, detail: "No Stripe key configured" }
    }

    const res = await apiGet<{ livemode?: boolean }>(`${API}/balance`, {
      headers: headers(key),
    })

    if (!res.ok) {
      return { ok: false, detail: `Rejected: ${res.error}`, latency_ms: res.latency_ms }
    }

    const mode = res.data?.livemode ? "LIVE" : "TEST"
    return {
      ok: true,
      detail: `Connected — ${mode} mode`,
      latency_ms: res.latency_ms,
    }
  },

  async usage({ credentials }): Promise<UsageResult> {
    const key = credentials.secret_key
    if (!key) {
      throw new Error("No Stripe key configured")
    }

    const cycle = currentMonthCycle()
    const metrics: Metric[] = []
    const warnings: string[] = []

    const balance = await apiGet<{ livemode?: boolean }>(`${API}/balance`, {
      headers: headers(key),
    })
    const live = balance.data?.livemode === true

    metrics.push({
      key: "live_mode",
      label: "Live mode",
      value: live ? 1 : 0,
      unit: "count",
      cumulative: false,
      note: live
        ? "Real money is being taken"
        : "TEST keys — no real payments will settle",
    })

    // Charges this cycle. `limit=100` is Stripe's max page; past that we report
    // "100+" rather than paginating — the portal wants a health signal, not an
    // accounting ledger, and walking pages daily burns the API budget.
    const charges = await apiGet<{
      data?: { amount?: number; paid?: boolean; currency?: string }[]
      has_more?: boolean
    }>(
      `${API}/charges?limit=100&created[gte]=${Math.floor(cycle.startMs / 1000)}`,
      { headers: headers(key) }
    )

    if (charges.ok) {
      const list = charges.data?.data ?? []
      const paid = list.filter((c) => c.paid)
      const gross = paid.reduce((sum, c) => sum + (c.amount ?? 0), 0) / 100

      metrics.push(
        {
          key: "charges_cycle",
          label: "Charges (cycle)",
          value: list.length,
          unit: "count",
          cumulative: true,
          note: charges.data?.has_more ? "100+ — capped at one page" : undefined,
        },
        {
          key: "failed_charges_cycle",
          label: "Failed charges (cycle)",
          value: list.length - paid.length,
          unit: "count",
          cumulative: true,
          alert_when: {
            above: 0,
            severity: "warning",
            reason: `${list.length - paid.length} charge(s) failed this cycle — check Stripe for declines or a misconfigured account`,
          },
        },
        {
          key: "gross_volume_usd",
          label: "Gross volume (cycle)",
          value: round(gross, 2),
          unit: "usd",
          cumulative: true,
        }
      )
    } else {
      warnings.push(`Charge list unavailable: ${charges.error}`)
    }

    // The webhook-verification gap. Two independent things must both be true.
    const endpoints = await apiGet<{
      data?: { url?: string; status?: string; enabled_events?: string[] }[]
    }>(`${API}/webhook_endpoints?limit=20`, { headers: headers(key) })

    const secretConfigured = Boolean(process.env.STRIPE_WEBHOOK_SECRET)

    if (endpoints.ok) {
      const enabled = (endpoints.data?.data ?? []).filter(
        (e) => e.status === "enabled"
      )
      metrics.push({
        key: "webhook_endpoints",
        label: "Enabled webhook endpoints",
        value: enabled.length,
        unit: "count",
        cumulative: false,
        note: enabled.length
          ? enabled.map((e) => e.url).join(", ").slice(0, 160)
          : "No enabled endpoint — asynchronous payment confirmation will never arrive",
        alert_when: {
          below: 1,
          severity: "warning",
          reason:
            "No enabled Stripe webhook endpoint — 3D Secure and other async payment flows will leave orders stuck pending after a successful charge",
        },
      })
    } else {
      warnings.push(`Webhook endpoints unreadable: ${endpoints.error}`)
    }

    metrics.push({
      key: "webhook_secret_configured",
      label: "Webhook signature verification",
      value: secretConfigured ? 1 : 0,
      unit: "count",
      cumulative: false,
      note: secretConfigured
        ? "STRIPE_WEBHOOK_SECRET is set — signatures are verified"
        : "STRIPE_WEBHOOK_SECRET is UNSET — /hooks/payment/stripe_stripe accepts unsigned payloads",
      alert_when: {
        below: 1,
        severity: "critical",
        reason:
          "STRIPE_WEBHOOK_SECRET is unset — the payment webhook accepts unsigned payloads, so anyone who finds the URL can forge payment confirmations",
      },
    })

    if (!secretConfigured) {
      warnings.push(
        "STRIPE_WEBHOOK_SECRET is unset: webhook payloads are not signature-verified."
      )
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

export default stripe
