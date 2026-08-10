import type { Metric } from "./types"

/**
 * Run-rate projection: given usage so far in a billing cycle, what will the
 * cycle end at?
 *
 * Deliberately linear. Anything cleverer (seasonality, weekday weighting,
 * regression on the snapshot history) needs more data than a daily collector
 * produces in a month, and would make a wrong answer harder to argue with. The
 * question this has to answer is "will we blow the free tier before the 30th",
 * and a straight line answers it well enough to act on a week early.
 *
 * Three rules keep the output honest:
 *
 *  1. **Only cumulative metrics are projected.** Storage size and current RAM
 *     are levels, not running totals — dividing them by elapsed days and
 *     multiplying by cycle length produces a number that means nothing.
 *  2. **Nothing is projected before a meaningful slice of the cycle has
 *     elapsed** (`MIN_ELAPSED_FRACTION`). On day 1 of a month, a single
 *     afternoon's bandwidth extrapolates to a terrifying and useless figure.
 *  3. **A missing value is not zero.** `value: null` means the provider could
 *     not tell us; it yields `projected: null`, never a reassuring 0.
 */

/** Below this fraction of the cycle, projections are too noisy to publish. */
const MIN_ELAPSED_FRACTION = 0.1

export type Projection = {
  metric_key: string
  label: string
  unit: Metric["unit"]
  current: number | null
  limit: number | null
  /** Extrapolated end-of-cycle value, or null when not projectable. */
  projected: number | null
  /** Current value as a % of limit. */
  current_pct: number | null
  /** Projected value as a % of limit — what alerting fires on. */
  projected_pct: number | null
  /** Why `projected` is null, when it is. */
  projection_note: string | null
  /**
   * Set when the metric tripped its own `alert_when` threshold rather than a
   * quota. Carries the provider's explanation straight through to the alert.
   */
  alert_reason: string | null
  status: "ok" | "warning" | "critical" | "unknown"
}

export type CycleWindow = {
  start: Date
  end: Date
  now: Date
}

/**
 * Elapsed fraction of the cycle, clamped to (0, 1].
 *
 * Clamped rather than allowed to run past 1 because providers report a cycle
 * end that has already passed for a day or two after rollover, and an elapsed
 * fraction above 1 would *shrink* the projection below current usage.
 */
export function elapsedFraction({ start, end, now }: CycleWindow): number {
  const total = end.getTime() - start.getTime()
  if (!Number.isFinite(total) || total <= 0) {
    return 1
  }
  const elapsed = now.getTime() - start.getTime()
  if (elapsed <= 0) {
    // Cycle hasn't started (clock skew). Treat as a full cycle so nothing is
    // projected — see rule 2.
    return 1
  }
  return Math.min(elapsed / total, 1)
}

export function projectMetric(
  metric: Metric,
  window: CycleWindow,
  options: { limitOverride?: number | null; thresholdPct?: number } = {}
): Projection {
  const threshold = options.thresholdPct ?? 90
  const limit =
    options.limitOverride ?? (typeof metric.limit === "number" ? metric.limit : null)

  const base: Projection = {
    metric_key: metric.key,
    label: metric.label,
    unit: metric.unit,
    current: metric.value,
    limit,
    projected: null,
    current_pct: null,
    projected_pct: null,
    projection_note: null,
    alert_reason: null,
    status: "unknown",
  }

  if (metric.value === null || !Number.isFinite(metric.value)) {
    base.projection_note = metric.note ?? "No value reported by the provider"
    return base
  }

  // A tripped `alert_when` is a definite answer and outranks quota maths —
  // "webhook verification is off" is not made less true by there being no
  // quota attached to it.
  const tripped = checkAlertWhen(metric)
  if (tripped) {
    base.alert_reason = tripped.reason
    base.status = tripped.severity
    base.projected = metric.cumulative ? base.projected : metric.value
    return base
  }

  base.current_pct =
    limit && limit > 0 ? round1((metric.value / limit) * 100) : null

  if (!metric.cumulative) {
    base.projection_note =
      "Point-in-time metric — a run rate would be meaningless, so the current value is what's checked"
    base.projected = metric.value
  } else {
    const fraction = elapsedFraction(window)
    if (fraction < MIN_ELAPSED_FRACTION) {
      base.projection_note = `Only ${Math.round(fraction * 100)}% into the billing cycle — too early to project`
    } else {
      base.projected = round1(metric.value / fraction)
    }
  }

  if (base.projected !== null && limit && limit > 0) {
    base.projected_pct = round1((base.projected / limit) * 100)
  }

  base.status = classify(base, threshold)
  return base
}

/**
 * Evaluate a metric's own threshold, if it declared one.
 *
 * Returns the tripped condition or null. Both bounds are exclusive so
 * `{ above: 0 }` reads naturally as "any failure at all is too many" and
 * `{ below: 1 }` as "this flag must be on".
 */
function checkAlertWhen(
  metric: Metric
): { severity: "warning" | "critical"; reason: string } | null {
  const rule = metric.alert_when
  if (!rule || metric.value === null) {
    return null
  }

  const over = rule.above !== undefined && metric.value > rule.above
  const under = rule.below !== undefined && metric.value < rule.below

  return over || under ? { severity: rule.severity, reason: rule.reason } : null
}

/**
 * Severity.
 *
 * Critical is reserved for "already over the line" — a projection, however
 * alarming, is still a guess, and paging on a guess trains people to ignore the
 * alerts. A breach of the *current* value is a fact.
 */
function classify(p: Projection, thresholdPct: number): Projection["status"] {
  if (p.limit === null || p.limit <= 0) {
    return "unknown"
  }
  if (p.current_pct !== null && p.current_pct >= 100) {
    return "critical"
  }
  if (p.projected_pct !== null && p.projected_pct >= 100) {
    return "warning"
  }
  if (p.projected_pct !== null && p.projected_pct >= thresholdPct) {
    return "warning"
  }
  if (p.current_pct !== null && p.current_pct >= thresholdPct && p.projected === null) {
    return "warning"
  }
  return "ok"
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

/** Falls back to the calendar month when a provider reports no cycle. */
export function windowFrom(
  cycleStart: string | Date | null,
  cycleEnd: string | Date | null,
  now: Date = new Date()
): CycleWindow {
  const start = cycleStart ? new Date(cycleStart) : monthStart(now)
  const end = cycleEnd ? new Date(cycleEnd) : monthEnd(now)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { start: monthStart(now), end: monthEnd(now), now }
  }
  return { start, end, now }
}

function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1))
}

function monthEnd(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))
}
