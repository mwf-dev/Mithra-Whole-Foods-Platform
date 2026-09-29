/**
 * In-process request + resource meter.
 *
 * Why this exists: Railway bills for **allocated RAM and CPU per minute the
 * container is running**, not per request. That makes the two questions you
 * actually need answered invisible from the Railway dashboard alone:
 *
 *   1. Is anything hitting this backend at all? (traffic)
 *   2. What is this process holding in RAM / burning in CPU while idle? (cost)
 *
 * Both are answered here, with no external service, no database writes and no
 * Redis — the meter must never become a cost of its own. Everything is a fixed
 * set of counters plus a 60-slot ring buffer; memory use is constant regardless
 * of traffic volume.
 *
 * Counters are per-process and reset on restart. That is deliberate: durable
 * metrics belong in PostHog/Sentry (see docs/OBSERVABILITY_SETUP.md), and this
 * is the zero-dependency floor that works even with every key unset.
 *
 * ## Known blind spot (measured 2026-08-06, not a bug to "fix" by retrying)
 *
 * Medusa mounts its own publishable-key check on `/store/*` and its admin auth
 * on `/admin/*` **before** anything registered via `defineMiddlewares`. Requests
 * rejected by those — a `/store/*` call with no `x-publishable-api-key`, an
 * unauthenticated `/admin/*` call — are therefore **not counted here**. Verified
 * directly: three keyed `/store/regions` calls incremented `store`, an unkeyed
 * one did not.
 *
 * What that means in practice: the meter sees all *legitimate* traffic plus
 * anything hitting the open surfaces (`/health`, `/homepage`, `/hooks/*`), and
 * it sees 429s from our own rate limiters (those run after this middleware).
 * It will under-count a bot spraying `/store/*` without a key. Those rejections
 * are cheap — no DB work — so they move the bill very little, but do not read
 * `total_requests` as "every packet that touched the box".
 */

/** Route families we bill-attribute separately. Order matters — first match wins. */
const ROUTE_CLASSES = [
  ["/health", "health"],
  ["/store", "store"],
  ["/admin", "admin"],
  ["/auth", "auth"],
  ["/hooks", "hooks"],
  ["/app", "admin-ui"],
  ["/homepage", "homepage"],
] as const

export type RouteClass = (typeof ROUTE_CLASSES)[number][1] | "other"

/** Requests slower than this are counted separately — they are the CPU-seconds you pay for. */
const SLOW_MS = 1_000

/** Ring buffer length. 60 one-minute slots = a rolling hour. */
const WINDOW_MINUTES = 60

type Counters = {
  requests: number
  errors: number
  rateLimited: number
  slow: number
  totalMs: number
  bytesOut: number
}

function emptyCounters(): Counters {
  return { requests: 0, errors: 0, rateLimited: 0, slow: 0, totalMs: 0, bytesOut: 0 }
}

const startedAt = Date.now()

/** Lifetime totals since process boot. */
const total = emptyCounters()

/** Lifetime totals split by route family. */
const byClass = new Map<RouteClass, Counters>()

/** Lifetime totals split by status class ("2xx", "4xx", …). */
const byStatus = new Map<string, number>()

/**
 * Rolling per-minute request counts. Indexed by `minuteSinceEpoch % 60`, with a
 * parallel array of the minute each slot belongs to so stale slots are
 * recognised rather than double-counted after an idle gap.
 */
const minuteCounts = new Array<number>(WINDOW_MINUTES).fill(0)
const minuteStamps = new Array<number>(WINDOW_MINUTES).fill(-1)

/** Largest single-minute request count seen since boot — the burst high-water mark. */
let peakRequestsPerMinute = 0

/** Wall-clock of the most recent non-health request. `null` = genuinely no traffic. */
let lastRealRequestAt: number | null = null

function classify(path: string): RouteClass {
  for (const [prefix, name] of ROUTE_CLASSES) {
    if (path === prefix || path.startsWith(prefix + "/")) {
      return name
    }
  }
  return "other"
}

function bump(counters: Counters, durationMs: number, status: number, bytes: number): void {
  counters.requests += 1
  counters.totalMs += durationMs
  counters.bytesOut += bytes
  if (status >= 500) counters.errors += 1
  if (status === 429) counters.rateLimited += 1
  if (durationMs >= SLOW_MS) counters.slow += 1
}

/**
 * Record one completed request. Never throws — a metering failure must not
 * turn a served request into a 500.
 */
export function recordRequest(opts: {
  path: string
  status: number
  durationMs: number
  bytesOut: number
}): void {
  try {
    const cls = classify(opts.path)

    bump(total, opts.durationMs, opts.status, opts.bytesOut)

    let counters = byClass.get(cls)
    if (!counters) {
      counters = emptyCounters()
      byClass.set(cls, counters)
    }
    bump(counters, opts.durationMs, opts.status, opts.bytesOut)

    const statusClass = `${Math.floor(opts.status / 100)}xx`
    byStatus.set(statusClass, (byStatus.get(statusClass) ?? 0) + 1)

    // Health probes are machine traffic. Counting them as "activity" would make
    // an idle backend look busy, which is the exact confusion this file exists
    // to resolve.
    if (cls !== "health") {
      lastRealRequestAt = Date.now()
    }

    const minute = Math.floor(Date.now() / 60_000)
    const slot = minute % WINDOW_MINUTES
    if (minuteStamps[slot] !== minute) {
      minuteStamps[slot] = minute
      minuteCounts[slot] = 0
    }
    minuteCounts[slot] += 1
    if (minuteCounts[slot] > peakRequestsPerMinute) {
      peakRequestsPerMinute = minuteCounts[slot]
    }
  } catch {
    // Metering is best-effort by design.
  }
}

function serialiseCounters(c: Counters) {
  return {
    requests: c.requests,
    errors_5xx: c.errors,
    rate_limited_429: c.rateLimited,
    slow_over_1s: c.slow,
    avg_ms: c.requests ? Math.round(c.totalMs / c.requests) : 0,
    bytes_out: c.bytesOut,
  }
}

/**
 * Requests in the rolling hour, and the busiest minute inside it. Slots whose
 * stamp is older than the window are ignored, so an idle hour reports 0 rather
 * than replaying last week's numbers.
 */
function rollingWindow() {
  const nowMinute = Math.floor(Date.now() / 60_000)
  let requests = 0
  let busiestMinute = 0

  for (let i = 0; i < WINDOW_MINUTES; i++) {
    const stamp = minuteStamps[i]
    if (stamp < 0 || nowMinute - stamp >= WINDOW_MINUTES) continue
    requests += minuteCounts[i]
    if (minuteCounts[i] > busiestMinute) busiestMinute = minuteCounts[i]
  }

  return { requests, busiestMinute }
}

/**
 * Resource snapshot — the numbers Railway actually charges for.
 *
 * `rss` is the resident set size, which is what the platform meters as memory.
 * `cpuSecondsTotal` is cumulative process CPU since boot; divide the delta
 * between two readings by elapsed wall time to get average vCPU utilisation.
 */
function resourceSnapshot() {
  const mem = process.memoryUsage()
  const cpu = process.cpuUsage()
  const uptimeSeconds = process.uptime()
  const cpuSecondsTotal = (cpu.user + cpu.system) / 1e6

  return {
    rss_mb: Math.round(mem.rss / 1024 / 1024),
    heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
    heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
    external_mb: Math.round(mem.external / 1024 / 1024),
    cpu_seconds_total: Math.round(cpuSecondsTotal * 100) / 100,
    // Average fraction of one vCPU used since boot. An idle Node server sits
    // near 0.00-0.02; sustained values near 1.0 mean something is spinning.
    avg_vcpu_since_boot:
      uptimeSeconds > 0 ? Math.round((cpuSecondsTotal / uptimeSeconds) * 1000) / 1000 : 0,
  }
}

export function getMetrics() {
  const window = rollingWindow()
  const uptimeSeconds = Math.round(process.uptime())

  return {
    process: {
      started_at: new Date(startedAt).toISOString(),
      uptime_seconds: uptimeSeconds,
      uptime_human: formatDuration(uptimeSeconds),
      worker_mode: process.env.MEDUSA_WORKER_MODE || "shared",
      admin_ui_served: process.env.DISABLE_MEDUSA_ADMIN !== "true",
      node_env: process.env.NODE_ENV || "unknown",
    },
    // What you are billed for, whether or not anyone visits the site.
    resources: resourceSnapshot(),
    traffic: {
      total_requests: total.requests,
      requests_last_hour: window.requests,
      busiest_minute_last_hour: window.busiestMinute,
      peak_requests_per_minute_since_boot: peakRequestsPerMinute,
      avg_requests_per_hour_since_boot:
        uptimeSeconds > 0 ? Math.round((total.requests / uptimeSeconds) * 3600 * 10) / 10 : 0,
      last_non_health_request_at: lastRealRequestAt
        ? new Date(lastRealRequestAt).toISOString()
        : null,
      idle_seconds: lastRealRequestAt
        ? Math.round((Date.now() - lastRealRequestAt) / 1000)
        : null,
      totals: serialiseCounters(total),
      by_route_class: Object.fromEntries(
        [...byClass.entries()].map(([k, v]) => [k, serialiseCounters(v)])
      ),
      by_status_class: Object.fromEntries(byStatus),
    },
  }
}

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return `${d}d ${h}h ${m}m`
}

/** Guard against double-registration — Medusa loads middlewares once, but be safe. */
let heartbeatStarted = false

/**
 * Emit a one-line summary into the platform logs on an interval.
 *
 * This is the part that answers "was anything actually hitting my backend last
 * Tuesday?" retroactively — Railway keeps logs, and this puts a permanent,
 * greppable record of traffic *and* RAM/CPU in them. Grep for `[usage]`.
 *
 * The timer is `unref`'d so it can never hold the event loop open and delay a
 * shutdown, and it logs on a 15-minute cadence — frequent enough to see a
 * pattern, rare enough that log volume stays negligible. `USAGE_HEARTBEAT_MS`
 * overrides the cadence (used to verify the meter without waiting 15 minutes;
 * leave it unset in production).
 */
export function startUsageHeartbeat(
  intervalMs = Number(process.env.USAGE_HEARTBEAT_MS) || 15 * 60 * 1000
): void {
  if (heartbeatStarted) return
  heartbeatStarted = true

  const timer = setInterval(() => {
    try {
      const m = getMetrics()
      console.log(
        `[usage] uptime=${m.process.uptime_human} rss=${m.resources.rss_mb}MB ` +
          `heap=${m.resources.heap_used_mb}/${m.resources.heap_total_mb}MB ` +
          `avg_vcpu=${m.resources.avg_vcpu_since_boot} ` +
          `req_total=${m.traffic.total_requests} req_1h=${m.traffic.requests_last_hour} ` +
          `peak_rpm=${m.traffic.peak_requests_per_minute_since_boot} ` +
          `idle_s=${m.traffic.idle_seconds ?? "never-served"} ` +
          `by_class=${JSON.stringify(
            Object.fromEntries(
              Object.entries(m.traffic.by_route_class).map(([k, v]) => [k, v.requests])
            )
          )}`
      )
    } catch {
      // Never let the heartbeat take the process down.
    }
  }, intervalMs)

  timer.unref?.()
}
