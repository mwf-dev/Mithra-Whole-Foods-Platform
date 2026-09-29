import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PLATFORM_MONITOR_MODULE } from "../../modules/platform-monitor"
import { reportError } from "../observability"
import { contextFor } from "./connections"
import { getProvider, PROVIDERS, missingFields } from "./providers"
import { projectMetric, windowFrom, type Projection } from "./run-rate"
import { sendAlertDigest } from "./notify"
import type { Metric, UsageResult } from "./types"

/**
 * Fetch usage from every configured platform, store a snapshot, and raise or
 * clear alerts.
 *
 * Run by the daily scheduled job and by the "Refresh now" button.
 *
 * ## Failure policy
 *
 * One vendor being down must never stop the others being collected, and must
 * never throw out of the scheduled job — a monitoring tool that crashes the
 * worker is worse than no monitoring tool. Every provider is wrapped
 * individually; a failure is recorded *as a snapshot* with `status: "error"`,
 * which is what makes "Neon has not answered for three days" visible rather
 * than merely absent.
 */

/** Snapshots older than this are pruned. A year of daily rows is ~4KB. */
const RETENTION_DAYS = 400

/** Re-notify an unresolved, unacknowledged alert at most this often. */
const RENOTIFY_AFTER_MS = 24 * 60 * 60 * 1000

export type CollectionResult = {
  provider: string
  status: "ok" | "error" | "skipped"
  detail?: string
  metrics_collected?: number
}

export async function collectAll(
  container: any,
  options: { providerIds?: string[]; notify?: boolean } = {}
): Promise<{ results: CollectionResult[]; alerts_raised: number; alerts_resolved: number }> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const svc = container.resolve(PLATFORM_MONITOR_MODULE)

  const rows = await svc.listPlatformConnections({})
  const rowByProvider = new Map<string, any>(rows.map((r: any) => [r.provider, r]))

  const targets = (options.providerIds?.length
    ? options.providerIds.map((id) => getProvider(id)).filter(Boolean)
    : PROVIDERS) as typeof PROVIDERS

  const results: CollectionResult[] = []
  const capturedAt = new Date()

  for (const provider of targets) {
    const row = rowByProvider.get(provider.id)

    if (row && row.enabled === false) {
      results.push({ provider: provider.id, status: "skipped", detail: "Disabled" })
      continue
    }

    const ctx = contextFor(provider, row, container)
    const missing = missingFields(provider, ctx)
    if (missing.length) {
      results.push({
        provider: provider.id,
        status: "skipped",
        detail: `Not configured — missing: ${missing.join(", ")}`,
      })
      continue
    }

    let usage: UsageResult | null = null
    let error: string | null = null

    try {
      usage = await provider.usage(ctx)
    } catch (e: any) {
      error = (e?.message ?? "unknown error").slice(0, 400)
      // Worth a Sentry event: a persistent adapter failure means the portal is
      // quietly blind to a service someone is paying for.
      reportError(e, {
        scope: `platform-monitor.collect.${provider.id}`,
        level: "warning",
      })
    }

    await svc.createUsageSnapshots({
      provider: provider.id,
      captured_at: capturedAt,
      cycle_start: usage?.cycle_start ? new Date(usage.cycle_start) : null,
      cycle_end: usage?.cycle_end ? new Date(usage.cycle_end) : null,
      metrics: usage?.metrics ?? [],
      cost_estimate_usd: usage?.cost_estimate_usd ?? null,
      status: error ? "error" : "ok",
      error,
    })

    const patch = error
      ? { last_status: "error", last_status_detail: error, last_checked_at: capturedAt }
      : {
          last_status: "ok",
          last_status_detail: null,
          last_checked_at: capturedAt,
          last_collected_at: capturedAt,
        }

    if (row) {
      await svc.updatePlatformConnections({ id: row.id, ...patch })
    } else {
      await svc.createPlatformConnections({
        provider: provider.id,
        label: provider.label,
        settings: {},
        enabled: true,
        ...patch,
      })
    }

    results.push({
      provider: provider.id,
      status: error ? "error" : "ok",
      detail: error ?? undefined,
      metrics_collected: usage?.metrics.length ?? 0,
    })
  }

  const alertOutcome = await evaluateAlerts(container)

  if (options.notify !== false) {
    try {
      await sendAlertDigest(container)
    } catch (e: any) {
      // Never let a broken notification channel fail a collection run.
      reportError(e, { scope: "platform-monitor.notify", level: "warning" })
      logger.warn(`[platform-monitor] alert notification failed: ${e?.message}`)
    }
  }

  await pruneSnapshots(container)

  logger.info(
    `[platform-monitor] collected ${results.filter((r) => r.status === "ok").length}/${results.length} providers, ` +
      `${alertOutcome.raised} alert(s) raised, ${alertOutcome.resolved} resolved`
  )

  return {
    results,
    alerts_raised: alertOutcome.raised,
    alerts_resolved: alertOutcome.resolved,
  }
}

/**
 * The most recent snapshot per provider, with run-rate projections and any
 * budget overrides applied. This is what the overview screen renders.
 */
export async function buildOverview(container: any) {
  const svc = container.resolve(PLATFORM_MONITOR_MODULE)

  const [snapshots, budgets, alerts, connections] = await Promise.all([
    svc.listUsageSnapshots({}, { order: { captured_at: "DESC" }, take: 400 }),
    svc.listPlatformBudgets({ enabled: true }),
    svc.listPlatformAlerts({ resolved_at: null }, { order: { triggered_at: "DESC" } }),
    svc.listPlatformConnections({}),
  ])

  const budgetKey = (p: string, m: string) => `${p}:${m}`
  const budgetMap = new Map<string, { limit_value: number; threshold_pct: number }>(
    budgets.map((b: any) => [
      budgetKey(b.provider, b.metric_key),
      { limit_value: b.limit_value, threshold_pct: b.threshold_pct },
    ])
  )

  const latest = new Map<string, any>()
  for (const s of snapshots) {
    if (!latest.has(s.provider)) {
      latest.set(s.provider, s)
    }
  }

  const connByProvider = new Map<string, any>(
    connections.map((c: any) => [c.provider, c])
  )
  const now = new Date()

  const providers = PROVIDERS.map((provider) => {
    const snapshot = latest.get(provider.id)
    const conn = connByProvider.get(provider.id)
    const window = windowFrom(
      snapshot?.cycle_start ?? null,
      snapshot?.cycle_end ?? null,
      now
    )

    const projections: Projection[] = ((snapshot?.metrics ?? []) as Metric[]).map(
      (metric) => {
        const budget = budgetMap.get(budgetKey(provider.id, metric.key))
        return projectMetric(metric, window, {
          limitOverride: budget?.limit_value ?? null,
          thresholdPct: budget?.threshold_pct,
        })
      }
    )

    return {
      provider: provider.id,
      label: conn?.label || provider.label,
      category: provider.category,
      builtin: Boolean(provider.builtin),
      enabled: conn ? conn.enabled : true,
      status: snapshot?.status ?? "never",
      error: snapshot?.error ?? null,
      last_status: conn?.last_status ?? "unconfigured",
      last_status_detail: conn?.last_status_detail ?? null,
      captured_at: snapshot?.captured_at ?? null,
      cycle_start: snapshot?.cycle_start ?? null,
      cycle_end: snapshot?.cycle_end ?? null,
      cycle_elapsed_pct: Math.round(
        ((now.getTime() - window.start.getTime()) /
          Math.max(window.end.getTime() - window.start.getTime(), 1)) *
          100
      ),
      cost_estimate_usd: snapshot?.cost_estimate_usd ?? null,
      metrics: projections,
      worst_status: worstOf(projections.map((p) => p.status)),
    }
  })

  const totalCost = providers.reduce(
    (sum, p) => sum + (typeof p.cost_estimate_usd === "number" ? p.cost_estimate_usd : 0),
    0
  )

  return {
    generated_at: now.toISOString(),
    estimated_cycle_cost_usd: Math.round(totalCost * 100) / 100,
    overall_status: worstOf(providers.map((p) => p.worst_status)),
    providers,
    alerts,
  }
}

function worstOf(statuses: string[]): "ok" | "warning" | "critical" | "unknown" {
  if (statuses.includes("critical")) return "critical"
  if (statuses.includes("warning")) return "warning"
  if (statuses.some((s) => s === "ok")) return "ok"
  return "unknown"
}

/**
 * Compare the latest projections against limits, raise new alerts, refresh
 * ongoing ones, and resolve conditions that have cleared.
 *
 * Alerts are keyed by `provider:metric:severity` so a warning escalating to
 * critical opens a *new* alert rather than mutating the old one — the history
 * of "we were warned on the 12th" stays intact.
 */
export async function evaluateAlerts(
  container: any
): Promise<{ raised: number; resolved: number }> {
  const svc = container.resolve(PLATFORM_MONITOR_MODULE)
  const overview = await buildOverview(container)
  const now = new Date()

  const active = new Map<
    string,
    { provider: string; metric_key: string; severity: "warning" | "critical"; message: string; context: any }
  >()

  for (const provider of overview.providers) {
    // A provider that stopped answering is itself an alert — otherwise its
    // metrics simply vanish and the dashboard looks calm.
    if (provider.status === "error") {
      const fp = `${provider.provider}:_collection:critical`
      active.set(fp, {
        provider: provider.provider,
        metric_key: "_collection",
        severity: "critical",
        message: `${provider.label}: usage collection is failing — ${provider.error ?? "unknown error"}`,
        context: { error: provider.error },
      })
    }

    for (const m of provider.metrics) {
      if (m.status !== "warning" && m.status !== "critical") {
        continue
      }
      const fp = `${provider.provider}:${m.metric_key}:${m.status}`
      active.set(fp, {
        provider: provider.provider,
        metric_key: m.metric_key,
        severity: m.status,
        message: m.alert_reason
          ? `${provider.label}: ${m.alert_reason}`
          : m.status === "critical"
            ? `${provider.label}: ${m.label} is at ${m.current_pct}% of its limit (${m.current} / ${m.limit})`
            : `${provider.label}: ${m.label} is projected to reach ${m.projected} of ${m.limit} by cycle end (${m.projected_pct}%)`,
        context: {
          current: m.current,
          projected: m.projected,
          limit: m.limit,
          unit: m.unit,
          cycle_end: provider.cycle_end,
        },
      })
    }
  }

  const open = await svc.listPlatformAlerts({ resolved_at: null })
  const openByFingerprint = new Map<string, any>(
    open.map((a: any) => [a.fingerprint, a])
  )

  let raised = 0
  for (const [fingerprint, alert] of active) {
    const existing = openByFingerprint.get(fingerprint)
    if (existing) {
      await svc.updatePlatformAlerts({
        id: existing.id,
        last_seen_at: now,
        message: alert.message,
        context: alert.context,
      })
      continue
    }

    await svc.createPlatformAlerts({
      fingerprint,
      provider: alert.provider,
      metric_key: alert.metric_key,
      severity: alert.severity,
      message: alert.message,
      context: alert.context,
      triggered_at: now,
      last_seen_at: now,
    })
    raised++
  }

  let resolved = 0
  for (const alert of open) {
    if (!active.has(alert.fingerprint)) {
      await svc.updatePlatformAlerts({ id: alert.id, resolved_at: now })
      resolved++
    }
  }

  return { raised, resolved }
}

/** Alerts that should go out on this run. Exported for the notifier. */
export async function pendingNotifications(container: any) {
  const svc = container.resolve(PLATFORM_MONITOR_MODULE)
  const open = await svc.listPlatformAlerts({ resolved_at: null })
  const cutoff = Date.now() - RENOTIFY_AFTER_MS

  return open.filter((a: any) => {
    if (a.acknowledged_at) {
      return false
    }
    if (!a.notified_at) {
      return true
    }
    return new Date(a.notified_at).getTime() < cutoff
  })
}

async function pruneSnapshots(container: any): Promise<void> {
  const svc = container.resolve(PLATFORM_MONITOR_MODULE)
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  const stale = await svc.listUsageSnapshots({
    captured_at: { $lt: cutoff },
  })

  if (stale.length) {
    await svc.deleteUsageSnapshots(stale.map((s: any) => s.id))
  }
}
