import { apiGet } from "../http"
import type { PlatformProvider, Metric, UsageResult } from "../types"
import { currentMonthCycle } from "./vercel"

/**
 * The public storefront — an end-to-end probe, not a vendor account.
 *
 * Vercel can report a perfectly healthy deployment while the site is broken,
 * because the storefront's health depends on *this* backend answering. Its
 * `/health` route is a deep readiness probe (it calls through to the Medusa
 * API), so a single request here exercises the whole chain the shopper uses:
 * Vercel edge → Next server → Railway → Neon.
 *
 * `/health` also returns the deployed commit. That is deliberately surfaced as
 * a metric: this project deploys the storefront by hand (`vercel --prod`), so
 * "the fix is merged" and "the fix is live" routinely disagree, and the version
 * shown here is the only cheap way to tell them apart.
 */

const storefront: PlatformProvider = {
  id: "storefront",
  label: "Storefront (end-to-end)",
  category: "internal",
  docs_url: "",
  setup_hint:
    "Defaults to STOREFRONT_URL. Override only to probe a different environment.",
  credential_fields: [],
  setting_fields: [
    {
      key: "url",
      label: "Storefront URL",
      type: "text",
      required: false,
      placeholder: "https://…",
      env: "STOREFRONT_URL",
    },
  ],
  builtin: true,

  async test({ settings }) {
    const base = baseUrl(settings)
    if (!base) {
      return { ok: false, detail: "No storefront URL configured" }
    }

    const res = await apiGet<HealthBody>(`${base}/health`, { timeoutMs: 15_000 })

    if (!res.ok) {
      // A 503 from a deep readiness probe is a real answer, not a transport
      // failure — say which one it is rather than "request failed".
      return {
        ok: false,
        detail:
          res.status === 503
            ? `Storefront reachable but NOT ready: ${describe(res.data)}`
            : `Unreachable: ${res.error}`,
        latency_ms: res.latency_ms,
      }
    }

    return {
      ok: true,
      detail: `Healthy in ${res.latency_ms}ms — ${describe(res.data)}`,
      latency_ms: res.latency_ms,
    }
  },

  async usage({ settings }): Promise<UsageResult> {
    const base = baseUrl(settings)
    const cycle = currentMonthCycle()

    if (!base) {
      throw new Error("No storefront URL configured")
    }

    const res = await apiGet<HealthBody>(`${base}/health`, { timeoutMs: 15_000 })

    const metrics: Metric[] = [
      {
        key: "health_ok",
        label: "Storefront healthy",
        value: res.ok ? 1 : 0,
        unit: "count",
        cumulative: false,
        note: res.ok ? undefined : res.error ?? "not ready",
        alert_when: {
          below: 1,
          severity: "critical",
          reason: `The public storefront is not healthy — ${res.error ?? "readiness probe failed"}`,
        },
      },
      {
        key: "health_latency_ms",
        label: "Health probe latency",
        value: res.latency_ms,
        unit: "ms",
        cumulative: false,
        note: "Round trip through Vercel → Next → this backend → Neon.",
      },
    ]

    const commit = res.data?.commit ?? res.data?.version ?? null
    if (commit) {
      metrics.push({
        key: "deployed_commit",
        label: "Deployed commit",
        // Numeric metrics only, so the value carries in the note instead.
        value: null,
        unit: "count",
        cumulative: false,
        note: String(commit).slice(0, 40),
      })
    }

    return {
      cycle_start: cycle.start,
      cycle_end: cycle.end,
      metrics,
      cost_estimate_usd: null,
    }
  },
}

type HealthBody = {
  status?: string
  commit?: string
  version?: string
  checks?: Record<string, unknown>
} | null

function baseUrl(settings: Record<string, string>): string | null {
  const raw = settings.url || process.env.STOREFRONT_URL || ""
  return raw ? raw.replace(/\/+$/, "") : null
}

function describe(body: HealthBody): string {
  if (!body) {
    return "no body"
  }
  const parts: string[] = []
  if (body.status) {
    parts.push(`status ${body.status}`)
  }
  const commit = body.commit ?? body.version
  if (commit) {
    parts.push(`commit ${String(commit).slice(0, 12)}`)
  }
  return parts.length ? parts.join(", ") : "no details"
}

export default storefront
