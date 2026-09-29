import { apiGet, round } from "../http"
import type { PlatformProvider, Metric, UsageResult } from "../types"

/**
 * Vercel — storefront hosting.
 *
 * ## Honest note on Vercel usage numbers
 *
 * Vercel has no stable, documented, plan-independent REST endpoint that returns
 * "bandwidth used this month". The figures on the dashboard's Usage tab come
 * from an internal API that changes without notice and is scoped to a team
 * (Hobby accounts have no team). The original plan document assumed
 * `GET /v8/projects/{id}/usage` — that route does not exist.
 *
 * Rather than pretend, this adapter:
 *   - reports what the *stable public API* reliably gives us — deployment
 *     health, failure rate and deploy recency, which is the operational half of
 *     the question;
 *   - opportunistically tries the team usage endpoint and fills in bandwidth /
 *     function duration when the token happens to have the scope for it;
 *   - marks the rest `null` with a note explaining why, instead of showing a
 *     zero that reads as "we're using nothing".
 *
 * Token: Vercel dashboard → Settings → Tokens. Scope it to the single project.
 */

const API = "https://api.vercel.com"

function authHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` }
}

/** `?teamId=` must be appended to every call when the project lives in a team. */
function teamQuery(teamId?: string): string {
  return teamId ? `teamId=${encodeURIComponent(teamId)}` : ""
}

const vercel: PlatformProvider = {
  id: "vercel",
  label: "Vercel",
  category: "hosting",
  docs_url: "https://vercel.com/docs/rest-api",
  setup_hint:
    "Vercel → Account Settings → Tokens → Create. Scope it to the storefront's team. " +
    "Project ID is on the project's Settings → General page.",
  credential_fields: [
    {
      key: "token",
      label: "API token",
      type: "password",
      required: true,
      placeholder: "vercel_…",
      env: "VERCEL_API_TOKEN",
    },
  ],
  setting_fields: [
    {
      key: "project_id",
      label: "Project ID",
      type: "text",
      required: true,
      placeholder: "prj_…",
      env: "VERCEL_PROJECT_ID",
    },
    {
      key: "team_id",
      label: "Team ID (optional)",
      type: "text",
      required: false,
      placeholder: "team_…",
      env: "VERCEL_TEAM_ID",
    },
  ],

  async test({ credentials, settings }) {
    const token = credentials.token
    if (!token) {
      return { ok: false, detail: "No API token configured" }
    }

    const user = await apiGet<{ user?: { username?: string; email?: string } }>(
      `${API}/v2/user`,
      { headers: authHeaders(token) }
    )

    if (!user.ok) {
      return {
        ok: false,
        detail: `Token rejected: ${user.error}`,
        latency_ms: user.latency_ms,
      }
    }

    // A valid token pointed at the wrong project is the failure mode that
    // silently produces empty dashboards, so verify the project too.
    if (settings.project_id) {
      const q = teamQuery(settings.team_id)
      const project = await apiGet<{ name?: string }>(
        `${API}/v9/projects/${encodeURIComponent(settings.project_id)}${q ? `?${q}` : ""}`,
        { headers: authHeaders(token) }
      )

      if (!project.ok) {
        return {
          ok: false,
          detail: `Token valid, but project ${settings.project_id} is not reachable: ${project.error}`,
          latency_ms: project.latency_ms,
        }
      }

      return {
        ok: true,
        detail: `Connected as ${user.data?.user?.username ?? "user"} → project "${project.data?.name}"`,
        latency_ms: user.latency_ms + project.latency_ms,
      }
    }

    return {
      ok: true,
      detail: `Connected as ${user.data?.user?.username ?? "user"} (no project id set)`,
      latency_ms: user.latency_ms,
    }
  },

  async usage({ credentials, settings }): Promise<UsageResult> {
    const token = credentials.token
    const projectId = settings.project_id
    const warnings: string[] = []
    const metrics: Metric[] = []

    if (!token) {
      throw new Error("No Vercel API token configured")
    }

    const cycle = currentMonthCycle()

    // --- Deployment health (stable public API) -----------------------------
    if (projectId) {
      const since = Date.now() - 7 * 24 * 60 * 60 * 1000
      const q = new URLSearchParams({
        projectId,
        limit: "100",
        since: String(since),
      })
      if (settings.team_id) {
        q.set("teamId", settings.team_id)
      }

      const deployments = await apiGet<{
        deployments?: { state?: string; created?: number; readyState?: string }[]
      }>(`${API}/v6/deployments?${q.toString()}`, { headers: authHeaders(token) })

      if (deployments.ok) {
        const list = deployments.data?.deployments ?? []
        const failed = list.filter(
          (d) => (d.readyState ?? d.state) === "ERROR"
        ).length
        const newest = list.length
          ? Math.max(...list.map((d) => d.created ?? 0))
          : 0

        metrics.push(
          {
            key: "deployments_7d",
            label: "Deployments (7d)",
            value: list.length,
            unit: "count",
            cumulative: false,
          },
          {
            key: "failed_deployments_7d",
            label: "Failed deployments (7d)",
            value: failed,
            unit: "count",
            cumulative: false,
            note: failed ? "Check the Vercel deployment logs" : undefined,
            alert_when: {
              above: 0,
              severity: "warning",
              reason: `${failed} storefront deployment(s) failed in the last 7 days`,
            },
          },
          {
            key: "hours_since_deploy",
            label: "Hours since last deploy",
            value: newest ? round((Date.now() - newest) / 3_600_000, 1) : null,
            unit: "hours",
            cumulative: false,
            note: newest
              ? undefined
              : "No deployments in the last 7 days — the storefront is deployed manually (`vercel --prod`)",
          }
        )
      } else {
        warnings.push(`Deployment list unavailable: ${deployments.error}`)
      }
    } else {
      warnings.push("No project id set — deployment health cannot be read")
    }

    // --- Bandwidth / functions (best effort) -------------------------------
    // Only exists for team-scoped tokens, and the shape is not contractual.
    // Anything we cannot read is reported as unavailable, never as zero.
    let usageRead = false
    if (settings.team_id) {
      const q = new URLSearchParams({
        teamId: settings.team_id,
        from: String(cycle.startMs),
        to: String(Date.now()),
      })
      const usage = await apiGet<Record<string, any>>(
        `${API}/v1/usage?${q.toString()}`,
        { headers: authHeaders(token) }
      )

      if (usage.ok && usage.data) {
        const bandwidthBytes = pickNumber(usage.data, [
          "bandwidth",
          "dataTransfer",
          "artifacts.bandwidth",
        ])
        const fnSeconds = pickNumber(usage.data, [
          "serverlessFunctionExecution",
          "functionDuration",
        ])

        if (bandwidthBytes !== null) {
          metrics.push({
            key: "bandwidth_gb",
            label: "Bandwidth (cycle)",
            value: round(bandwidthBytes / 1024 ** 3, 3),
            unit: "gb",
            cumulative: true,
          })
          usageRead = true
        }
        if (fnSeconds !== null) {
          metrics.push({
            key: "function_hours",
            label: "Function execution (cycle)",
            value: round(fnSeconds / 3600, 2),
            unit: "hours",
            cumulative: true,
          })
          usageRead = true
        }
      }
    }

    if (!usageRead) {
      metrics.push(
        {
          key: "bandwidth_gb",
          label: "Bandwidth (cycle)",
          value: null,
          unit: "gb",
          cumulative: true,
          note: "Vercel exposes no stable public usage endpoint. Read it from the Usage tab, or set a Team ID with a team-scoped token.",
        },
        {
          key: "function_hours",
          label: "Function execution (cycle)",
          value: null,
          unit: "hours",
          cumulative: true,
          note: "Same limitation as bandwidth.",
        }
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

/** Vercel bills on calendar months. */
export function currentMonthCycle() {
  const now = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    startMs: start.getTime(),
  }
}

/** Read the first path that resolves to a finite number. */
function pickNumber(obj: Record<string, any>, paths: string[]): number | null {
  for (const path of paths) {
    const value = path
      .split(".")
      .reduce<any>((acc, part) => (acc == null ? acc : acc[part]), obj)
    if (typeof value === "number" && Number.isFinite(value)) {
      return value
    }
  }
  return null
}

export default vercel
