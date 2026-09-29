import { apiGet, round } from "../http"
import type { PlatformProvider, Metric, UsageResult } from "../types"

/**
 * Neon — the PostgreSQL database.
 *
 * Neon is the one vendor here with a genuinely good usage API: the project
 * object itself carries the consumption counters for the current billing
 * period, so a single `GET /projects/{id}` answers everything.
 *
 * Units, because they are easy to get wrong:
 *   - `compute_time_seconds` — CPU-seconds, *not* wall clock. Neon's free tier
 *     is quoted in "compute hours" = this / 3600.
 *   - `active_time_seconds` — wall clock the compute was awake.
 *   - `synthetic_storage_size` — bytes, the figure Neon bills storage on.
 *   - `data_transfer_bytes` / `written_data_bytes` — bytes for the period.
 *
 * Free-tier defaults are pre-seeded as limits so the dashboard is useful before
 * anyone sets a budget; a `platform_budget` row overrides them.
 */

const API = "https://console.neon.tech/api/v2"

/** Neon Free plan allowances, used only when the API reports no limit. */
const FREE_TIER = {
  compute_hours: 191.9,
  storage_gb: 0.5,
}

type NeonProject = {
  id: string
  name: string
  compute_time_seconds?: number
  active_time_seconds?: number
  written_data_bytes?: number
  data_transfer_bytes?: number
  synthetic_storage_size?: number
  consumption_period_start?: string
  consumption_period_end?: string
}

const neon: PlatformProvider = {
  id: "neon",
  label: "Neon",
  category: "database",
  docs_url: "https://api-docs.neon.tech/reference/getting-started-with-neon-api",
  setup_hint:
    "Neon Console → Account settings → API keys. Project ID is on the project's Settings page.",
  credential_fields: [
    {
      key: "api_key",
      label: "API key",
      type: "password",
      required: true,
      env: "NEON_API_KEY",
    },
  ],
  setting_fields: [
    {
      key: "project_id",
      label: "Project ID",
      type: "text",
      required: true,
      placeholder: "e.g. cool-forest-12345678",
      env: "NEON_PROJECT_ID",
    },
  ],

  async test({ credentials, settings }) {
    const key = credentials.api_key
    if (!key) {
      return { ok: false, detail: "No API key configured" }
    }
    if (!settings.project_id) {
      return { ok: false, detail: "No project id configured" }
    }

    const res = await apiGet<{ project?: NeonProject }>(
      `${API}/projects/${encodeURIComponent(settings.project_id)}`,
      { headers: { authorization: `Bearer ${key}` } }
    )

    if (!res.ok) {
      return {
        ok: false,
        detail:
          res.status === 404
            ? `Project ${settings.project_id} not found for this key`
            : `Rejected: ${res.error}`,
        latency_ms: res.latency_ms,
      }
    }

    return {
      ok: true,
      detail: `Connected to project "${res.data?.project?.name ?? settings.project_id}"`,
      latency_ms: res.latency_ms,
    }
  },

  async usage({ credentials, settings }): Promise<UsageResult> {
    const key = credentials.api_key
    const projectId = settings.project_id
    if (!key) {
      throw new Error("No Neon API key configured")
    }
    if (!projectId) {
      throw new Error("No Neon project id configured")
    }

    const res = await apiGet<{ project?: NeonProject }>(
      `${API}/projects/${encodeURIComponent(projectId)}`,
      { headers: { authorization: `Bearer ${key}` } }
    )

    if (!res.ok || !res.data?.project) {
      throw new Error(res.error ?? "Neon returned no project")
    }

    const p = res.data.project
    const metrics: Metric[] = [
      {
        key: "compute_hours",
        label: "Compute time (cycle)",
        value:
          typeof p.compute_time_seconds === "number"
            ? round(p.compute_time_seconds / 3600, 2)
            : null,
        unit: "hours",
        limit: FREE_TIER.compute_hours,
        cumulative: true,
        note: "Free-plan allowance shown as the limit until a budget overrides it",
      },
      {
        key: "active_hours",
        label: "Active time (cycle)",
        value:
          typeof p.active_time_seconds === "number"
            ? round(p.active_time_seconds / 3600, 2)
            : null,
        unit: "hours",
        cumulative: true,
      },
      {
        key: "storage_gb",
        label: "Storage",
        value:
          typeof p.synthetic_storage_size === "number"
            ? round(p.synthetic_storage_size / 1024 ** 3, 3)
            : null,
        unit: "gb",
        limit: FREE_TIER.storage_gb,
        // Storage is a level, not a total — projecting it linearly would be
        // meaningless. The alerting path checks the current value instead.
        cumulative: false,
      },
      {
        key: "written_data_gb",
        label: "Data written (cycle)",
        value:
          typeof p.written_data_bytes === "number"
            ? round(p.written_data_bytes / 1024 ** 3, 3)
            : null,
        unit: "gb",
        cumulative: true,
      },
      {
        key: "data_transfer_gb",
        label: "Data transfer (cycle)",
        value:
          typeof p.data_transfer_bytes === "number"
            ? round(p.data_transfer_bytes / 1024 ** 3, 3)
            : null,
        unit: "gb",
        cumulative: true,
      },
    ]

    return {
      cycle_start: p.consumption_period_start ?? null,
      cycle_end: p.consumption_period_end ?? null,
      metrics,
      cost_estimate_usd: null,
    }
  },
}

export default neon
