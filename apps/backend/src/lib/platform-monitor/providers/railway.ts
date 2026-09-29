import { apiRequest, round } from "../http"
import type { PlatformProvider, Metric, UsageResult } from "../types"
import { currentMonthCycle } from "./vercel"

/**
 * Railway — Medusa backend hosting.
 *
 * Railway's public API is GraphQL only (`backboard.railway.com/graphql/v2`).
 * Two token types exist and they behave differently:
 *   - **Account/team token** (`Authorization: Bearer …`) — can read `me` and
 *     project cost estimates. This is what the portal wants.
 *   - **Project token** (`Project-Access-Token: …`) — scoped to one project and
 *     cannot resolve `me`.
 * Both are sent; the API ignores the one it does not recognise.
 *
 * The number that matters here is **estimated cost for the current cycle**,
 * because Railway bills for allocated RAM/CPU per minute of uptime, not per
 * request (see `docs/COST_AUDIT_2026-08-06.md`). A backend with zero traffic
 * still costs money, so "is the bill moving" and "is anyone using it" are
 * genuinely different questions — the second is answered by the `backend`
 * provider in this same dashboard.
 */

const ENDPOINT = "https://backboard.railway.com/graphql/v2"

function headers(token: string): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
    "project-access-token": token,
  }
}

async function gql<T>(
  token: string,
  query: string,
  variables: Record<string, unknown> = {}
) {
  const res = await apiRequest<{ data?: T; errors?: { message: string }[] }>(
    ENDPOINT,
    {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ query, variables }),
    }
  )

  // GraphQL returns 200 with an `errors` array — a bare `res.ok` check would
  // read a failed query as success.
  if (res.ok && res.data?.errors?.length) {
    return {
      ok: false as const,
      data: null,
      error: res.data.errors.map((e) => e.message).join("; ").slice(0, 200),
      latency_ms: res.latency_ms,
    }
  }

  return {
    ok: res.ok,
    data: res.data?.data ?? null,
    error: res.error,
    latency_ms: res.latency_ms,
  }
}

const railway: PlatformProvider = {
  id: "railway",
  label: "Railway",
  category: "hosting",
  docs_url: "https://docs.railway.com/reference/public-api",
  setup_hint:
    "Railway → Account Settings → Tokens → create a team token. Project ID is the UUID in the project URL.",
  credential_fields: [
    {
      key: "token",
      label: "API token",
      type: "password",
      required: true,
      env: "RAILWAY_API_TOKEN",
    },
  ],
  setting_fields: [
    {
      key: "project_id",
      label: "Project ID",
      type: "text",
      required: true,
      placeholder: "uuid from the project URL",
      env: "RAILWAY_PROJECT_ID",
    },
  ],

  async test({ credentials, settings }) {
    const token = credentials.token
    if (!token) {
      return { ok: false, detail: "No API token configured" }
    }

    // `me` fails for project-scoped tokens, so fall back to resolving the
    // project itself before declaring the token bad.
    const me = await gql<{ me?: { name?: string; email?: string } }>(
      token,
      `query { me { id name email } }`
    )

    if (me.ok && me.data?.me) {
      return {
        ok: true,
        detail: `Connected as ${me.data.me.name || me.data.me.email || "account"}`,
        latency_ms: me.latency_ms,
      }
    }

    if (!settings.project_id) {
      return {
        ok: false,
        detail: `Token rejected and no project id to fall back on: ${me.error}`,
        latency_ms: me.latency_ms,
      }
    }

    const project = await gql<{ project?: { name?: string } }>(
      token,
      `query ($id: String!) { project(id: $id) { id name } }`,
      { id: settings.project_id }
    )

    if (project.ok && project.data?.project) {
      return {
        ok: true,
        detail: `Connected to project "${project.data.project.name}" (project-scoped token)`,
        latency_ms: project.latency_ms,
      }
    }

    return {
      ok: false,
      detail: `Token rejected: ${project.error || me.error}`,
      latency_ms: project.latency_ms,
    }
  },

  async usage({ credentials, settings }): Promise<UsageResult> {
    const token = credentials.token
    const projectId = settings.project_id
    if (!token) {
      throw new Error("No Railway API token configured")
    }

    const cycle = currentMonthCycle()
    const metrics: Metric[] = []
    const warnings: string[] = []
    let cost: number | null = null

    // Cost estimate for the current billing cycle.
    if (projectId) {
      const est = await gql<{
        estimatedUsage?: { estimatedValue?: number; measurement?: string }[]
      }>(
        token,
        `query ($projectId: String!) {
           estimatedUsage(projectId: $projectId) {
             measurement
             estimatedValue
           }
         }`,
        { projectId }
      )

      if (est.ok && est.data?.estimatedUsage?.length) {
        for (const row of est.data.estimatedUsage) {
          const value = row.estimatedValue
          if (typeof value !== "number") {
            continue
          }
          if (row.measurement === "CREDIT_SPEND" || row.measurement === "COST") {
            cost = round(value, 2)
          } else if (row.measurement === "MEMORY_USAGE_GB") {
            metrics.push({
              key: "memory_gb_hours",
              label: "Memory (cycle)",
              value: round(value, 2),
              unit: "gb_hours",
              cumulative: true,
            })
          } else if (row.measurement === "CPU_USAGE") {
            metrics.push({
              key: "cpu_hours",
              label: "vCPU (cycle)",
              value: round(value, 2),
              unit: "hours",
              cumulative: true,
            })
          } else if (row.measurement === "NETWORK_TX_GB") {
            metrics.push({
              key: "egress_gb",
              label: "Network egress (cycle)",
              value: round(value, 3),
              unit: "gb",
              cumulative: true,
            })
          }
        }
      } else {
        warnings.push(
          `Usage estimate unavailable: ${est.error ?? "empty response"}. ` +
            "A project-scoped token often cannot read this — use a team token."
        )
      }

      // Deployment health: one failed deploy is the difference between
      // "expensive" and "expensive and broken".
      const deploys = await gql<{
        deployments?: { edges?: { node?: { status?: string; createdAt?: string } }[] }
      }>(
        token,
        `query ($projectId: String!) {
           deployments(first: 10, input: { projectId: $projectId }) {
             edges { node { id status createdAt } }
           }
         }`,
        { projectId }
      )

      if (deploys.ok) {
        const nodes = (deploys.data?.deployments?.edges ?? [])
          .map((e) => e.node)
          .filter(Boolean) as { status?: string; createdAt?: string }[]
        const failed = nodes.filter((n) =>
          ["FAILED", "CRASHED"].includes(n.status ?? "")
        ).length

        metrics.push({
          key: "failed_deployments_recent",
          label: "Failed deploys (last 10)",
          value: failed,
          unit: "count",
          cumulative: false,
          alert_when: {
            above: 0,
            severity: "warning",
            reason: `${failed} of the last 10 backend deployments failed or crashed`,
          },
        })

        const active = nodes.find((n) => n.status === "SUCCESS")
        if (active?.createdAt) {
          metrics.push({
            key: "hours_since_deploy",
            label: "Hours since last deploy",
            value: round(
              (Date.now() - new Date(active.createdAt).getTime()) / 3_600_000,
              1
            ),
            unit: "hours",
            cumulative: false,
          })
        }
      } else {
        warnings.push(`Deployment status unavailable: ${deploys.error}`)
      }
    } else {
      warnings.push("No project id set — nothing to query")
    }

    if (cost !== null) {
      metrics.push({
        key: "estimated_cost_usd",
        label: "Estimated cost (cycle)",
        value: cost,
        unit: "usd",
        cumulative: true,
      })
    }

    return {
      cycle_start: cycle.start,
      cycle_end: cycle.end,
      metrics,
      cost_estimate_usd: cost,
      warnings,
    }
  },
}

export default railway
