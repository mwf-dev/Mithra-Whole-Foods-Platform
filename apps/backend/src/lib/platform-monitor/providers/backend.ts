import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { getMetrics } from "../../request-metrics"
import { round } from "../http"
import type { PlatformProvider, Metric, UsageResult } from "../types"
import { currentMonthCycle } from "./vercel"

/**
 * This backend itself — no credentials, always present.
 *
 * Exists because the vendor dashboards cannot answer the question that decides
 * whether the Railway bill is buying anything: *is traffic actually reaching
 * this process, and what is it holding while idle?* Railway bills allocated
 * RAM/CPU per minute of uptime, so an idle container and a busy one cost
 * roughly the same — juxtaposing `rss_mb` against `requests_last_hour` in one
 * view is what makes an over-provisioned or entirely unused service obvious.
 *
 * Counters come from the in-process meter (`src/lib/request-metrics.ts`) and
 * reset on every deploy; `uptime_hours` says how far back they reach. The
 * durable series is the snapshot history this portal writes.
 *
 * Also carries the database's own size, read from Postgres rather than from
 * Neon's API, so the number survives Neon's key being absent and can be
 * cross-checked against it.
 */

const backend: PlatformProvider = {
  id: "backend",
  label: "Medusa backend (this process)",
  category: "internal",
  docs_url: "",
  setup_hint: "No configuration — measures the process serving this admin page.",
  credential_fields: [],
  setting_fields: [],
  builtin: true,

  async test({ container }) {
    // "Healthy" for the backend means it can reach its database — everything
    // else in this app is downstream of that.
    if (!container) {
      return { ok: true, detail: "Process is up (no container to probe the DB)" }
    }

    const started = Date.now()
    try {
      const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
      await knex.raw("select 1")
      const latency = Date.now() - started
      return {
        ok: true,
        detail: `Up ${getMetrics().process.uptime_human}, database round trip ${latency}ms`,
        latency_ms: latency,
      }
    } catch (e: any) {
      return {
        ok: false,
        detail: `Database unreachable: ${e?.message ?? "unknown error"}`,
        latency_ms: Date.now() - started,
      }
    }
  },

  async usage({ container }): Promise<UsageResult> {
    const m = getMetrics()
    const cycle = currentMonthCycle()
    const warnings: string[] = []

    const metrics: Metric[] = [
      {
        key: "rss_mb",
        label: "Memory (RSS)",
        value: m.resources.rss_mb,
        unit: "count",
        cumulative: false,
        note: "MB. This is what Railway allocates and bills for.",
      },
      {
        key: "avg_vcpu",
        label: "Average vCPU since boot",
        value: m.resources.avg_vcpu_since_boot,
        unit: "count",
        cumulative: false,
        note: "An idle Node server sits near 0.00–0.02.",
      },
      {
        key: "uptime_hours",
        label: "Uptime",
        value: round(m.process.uptime_seconds / 3600, 1),
        unit: "hours",
        cumulative: false,
      },
      {
        key: "requests_last_hour",
        label: "Requests (last hour)",
        value: m.traffic.requests_last_hour,
        unit: "count",
        cumulative: false,
      },
      {
        key: "requests_since_boot",
        label: "Requests since boot",
        value: m.traffic.total_requests,
        unit: "count",
        cumulative: false,
      },
      {
        key: "store_requests_since_boot",
        label: "/store requests since boot",
        value: m.traffic.by_route_class?.store?.requests ?? 0,
        unit: "count",
        cumulative: false,
      },
      {
        key: "rate_limited_since_boot",
        label: "Rate-limited (429) since boot",
        value: m.traffic.totals?.rate_limited_429 ?? 0,
        unit: "count",
        cumulative: false,
        note: "The /store limit is a site-wide ceiling, not per shopper — any value here means real shoppers were turned away.",
        alert_when: {
          above: 0,
          severity: "warning",
          reason: `${m.traffic.totals?.rate_limited_429 ?? 0} request(s) were rate-limited since boot — because the /store limit is IP-keyed and the storefront is server-rendered, this means real shoppers were turned away`,
        },
      },
      {
        key: "errors_since_boot",
        label: "5xx since boot",
        value: m.traffic.by_status_class?.["5xx"] ?? 0,
        unit: "count",
        cumulative: false,
        alert_when: {
          above: 0,
          severity: "warning",
          reason: `${m.traffic.by_status_class?.["5xx"] ?? 0} server error(s) since boot`,
        },
      },
      {
        key: "idle_minutes",
        label: "Minutes since last real request",
        value:
          m.traffic.idle_seconds === null
            ? null
            : round(m.traffic.idle_seconds / 60, 1),
        unit: "count",
        cumulative: false,
        note:
          m.traffic.idle_seconds === null
            ? "No non-health request since boot — this container is being billed for nothing"
            : undefined,
      },
    ]

    // Database size, straight from Postgres.
    if (container) {
      try {
        const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)

        const sizeRow = await knex.raw(
          "select pg_database_size(current_database()) as bytes"
        )
        const bytes = Number(sizeRow?.rows?.[0]?.bytes ?? 0)
        metrics.push({
          key: "db_size_gb",
          label: "Database size",
          value: round(bytes / 1024 ** 3, 3),
          unit: "gb",
          cumulative: false,
        })

        // Round-trip latency to the database. This project has a known
        // cross-continent hop (Railway sin1 → Neon us-east-1, ~290ms measured
        // 2026-08-06); tracking it here means a regression or a fix is visible
        // as a step change in the history chart rather than a vague "feels
        // slow". Three samples, because a single one catches a cold connection.
        const samples: number[] = []
        for (let i = 0; i < 3; i++) {
          const t = Date.now()
          await knex.raw("select 1")
          samples.push(Date.now() - t)
        }
        metrics.push({
          key: "db_latency_ms",
          label: "Database round trip",
          value: Math.min(...samples),
          unit: "ms",
          cumulative: false,
          note: "Same-region should be 1–3ms. ~290ms means backend and database are in different regions.",
        })
      } catch (e: any) {
        warnings.push(`Database metrics unavailable: ${e?.message ?? "unknown"}`)
      }
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

export default backend
