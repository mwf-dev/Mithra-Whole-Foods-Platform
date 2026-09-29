import {
  elapsedFraction,
  projectMetric,
  windowFrom,
} from "../platform-monitor/run-rate"
import type { Metric } from "../platform-monitor/types"

/**
 * The run-rate maths is the one part of the infrastructure portal that produces
 * a *claim* rather than a reading — "you will run out of Neon compute on the
 * 24th". Everything else just forwards a vendor's number. So this is where the
 * tests go: a wrong projection either cries wolf until people mute the channel,
 * or stays quiet through an overage.
 */

const CYCLE_START = new Date("2026-08-01T00:00:00Z")
const CYCLE_END = new Date("2026-09-01T00:00:00Z")

/** n days into a 31-day August. */
const dayOf = (n: number) => new Date(`2026-08-${String(n).padStart(2, "0")}T00:00:00Z`)

const metric = (over: Partial<Metric> = {}): Metric => ({
  key: "bandwidth_gb",
  label: "Bandwidth",
  value: 10,
  unit: "gb",
  cumulative: true,
  ...over,
})

const windowAt = (now: Date) => ({ start: CYCLE_START, end: CYCLE_END, now })

describe("elapsedFraction", () => {
  it("is the fraction of the cycle that has passed", () => {
    // Start of the 16th = 15 full days of a 31-day month.
    expect(elapsedFraction(windowAt(dayOf(16)))).toBeCloseTo(15 / 31, 5)
  })

  it("clamps past the end of the cycle to 1", () => {
    // Providers keep reporting a cycle end for a day or two after rollover.
    // Without the clamp, fraction > 1 would project *below* current usage —
    // the collector would quietly report shrinking bandwidth.
    const fraction = elapsedFraction(windowAt(new Date("2026-09-05T00:00:00Z")))
    expect(fraction).toBe(1)
  })

  it("treats a not-yet-started cycle as complete so nothing is projected", () => {
    // Clock skew, not a real state. Returning 1 makes the projection equal the
    // current value rather than dividing by ~0 and reporting infinity.
    expect(elapsedFraction(windowAt(new Date("2026-07-20T00:00:00Z")))).toBe(1)
  })

  it("survives a zero-length or invalid cycle", () => {
    expect(
      elapsedFraction({ start: CYCLE_START, end: CYCLE_START, now: dayOf(16) })
    ).toBe(1)
  })
})

describe("projectMetric", () => {
  it("extrapolates a cumulative metric linearly to the end of the cycle", () => {
    // 10 GB over the first 15 of 31 days → ~20.7 GB by month end.
    const p = projectMetric(metric({ value: 10, limit: 100 }), windowAt(dayOf(16)))
    expect(p.projected).toBeCloseTo(20.7, 1)
    expect(p.current_pct).toBe(10)
    expect(p.projected_pct).toBeCloseTo(20.7, 1)
    expect(p.status).toBe("ok")
  })

  it("refuses to project in the first 10% of a cycle", () => {
    // One afternoon's traffic extrapolated across a month is noise dressed up
    // as a forecast, and it is exactly when a new deploy skews the numbers.
    const p = projectMetric(metric({ value: 2, limit: 100 }), windowAt(dayOf(2)))
    expect(p.projected).toBeNull()
    expect(p.projection_note).toMatch(/too early to project/)
    // The current reading is still reported — only the forecast is withheld.
    expect(p.current_pct).toBe(2)
  })

  it("does not project point-in-time metrics", () => {
    // Storage is a level. Multiplying it by the inverse elapsed fraction would
    // claim a 0.4 GB database becomes 0.8 GB purely because it is mid-month.
    const p = projectMetric(
      metric({ key: "storage_gb", value: 0.4, limit: 0.5, cumulative: false }),
      windowAt(dayOf(16))
    )
    expect(p.projected).toBe(0.4)
    expect(p.projection_note).toMatch(/Point-in-time/)
    // 80% of the limit, under the default 90% threshold — mid-month has no
    // bearing on it, which is the whole point.
    expect(p.status).toBe("ok")
  })

  it("still classifies a point-in-time metric that crosses the threshold", () => {
    // Not projecting must not mean not checking: a database at 94% of its
    // storage limit is a problem today regardless of the date.
    const p = projectMetric(
      metric({ key: "storage_gb", value: 0.47, limit: 0.5, cumulative: false }),
      windowAt(dayOf(16))
    )
    expect(p.current_pct).toBe(94)
    expect(p.status).toBe("warning")
  })

  it("treats a missing value as unknown, never as zero", () => {
    // A provider that could not answer must not render as "using nothing".
    const p = projectMetric(
      metric({ value: null, limit: 100, note: "Token lacks team scope" }),
      windowAt(dayOf(16))
    )
    expect(p.current).toBeNull()
    expect(p.projected).toBeNull()
    expect(p.status).toBe("unknown")
    expect(p.projection_note).toBe("Token lacks team scope")
  })

  it("warns when the projection crosses the threshold but current usage has not", () => {
    // The whole point: act while there is still time. 50 GB by day 16 of 31
    // projects to ~103 GB against a 100 GB limit.
    const p = projectMetric(metric({ value: 50, limit: 100 }), windowAt(dayOf(16)))
    expect(p.current_pct).toBe(50)
    expect(p.projected_pct).toBeGreaterThan(100)
    expect(p.status).toBe("warning")
  })

  it("escalates to critical only once the limit is actually breached", () => {
    // Critical is reserved for facts. A scary projection stays a warning —
    // paging on a guess is how alerts get ignored.
    const p = projectMetric(metric({ value: 105, limit: 100 }), windowAt(dayOf(16)))
    expect(p.current_pct).toBe(105)
    expect(p.status).toBe("critical")
  })

  it("honours a budget override in place of the provider's limit", () => {
    // "Warn me at 70% of the free tier" is a different number from the plan
    // limit, and the budget row must win.
    const p = projectMetric(metric({ value: 20, limit: 1000 }), windowAt(dayOf(16)), {
      limitOverride: 50,
      thresholdPct: 70,
    })
    expect(p.limit).toBe(50)
    // 41.3 projected / 50 — the percentage derives from the *rounded*
    // projection, so it is 82.6 rather than 82.67.
    expect(p.projected_pct).toBeCloseTo(82.6, 1)
    expect(p.status).toBe("warning")
  })

  it("reports unknown when nothing supplies a limit", () => {
    // No limit means no judgement to make — the number is still shown, but it
    // must not be coloured green as though it had been checked.
    const p = projectMetric(metric({ value: 10, limit: null }), windowAt(dayOf(16)))
    expect(p.projected).toBeCloseTo(20.7, 1)
    expect(p.status).toBe("unknown")
    expect(p.projected_pct).toBeNull()
  })
})

describe("alert_when thresholds", () => {
  // These cover the checks with no quota behind them — the ones that are
  // *most* worth alerting on and would otherwise classify as "unknown" and
  // render as calmly as a healthy row.

  it("raises when a required flag is off", () => {
    const p = projectMetric(
      metric({
        key: "webhook_secret_configured",
        value: 0,
        limit: null,
        cumulative: false,
        alert_when: {
          below: 1,
          severity: "critical",
          reason: "STRIPE_WEBHOOK_SECRET is unset",
        },
      }),
      windowAt(dayOf(16))
    )
    expect(p.status).toBe("critical")
    expect(p.alert_reason).toBe("STRIPE_WEBHOOK_SECRET is unset")
  })

  it("stays quiet when the flag is on", () => {
    const p = projectMetric(
      metric({
        key: "webhook_secret_configured",
        value: 1,
        limit: null,
        cumulative: false,
        alert_when: { below: 1, severity: "critical", reason: "unset" },
      }),
      windowAt(dayOf(16))
    )
    expect(p.alert_reason).toBeNull()
    // No limit and no tripped threshold — nothing to judge.
    expect(p.status).toBe("unknown")
  })

  it("raises on any nonzero failure count", () => {
    const p = projectMetric(
      metric({
        key: "failed_charges_cycle",
        value: 3,
        limit: null,
        alert_when: { above: 0, severity: "warning", reason: "3 charges failed" },
      }),
      windowAt(dayOf(16))
    )
    expect(p.status).toBe("warning")
    expect(p.alert_reason).toBe("3 charges failed")
  })

  it("treats zero failures as clean", () => {
    const p = projectMetric(
      metric({
        key: "failed_charges_cycle",
        value: 0,
        limit: null,
        alert_when: { above: 0, severity: "warning", reason: "failed" },
      }),
      windowAt(dayOf(16))
    )
    expect(p.alert_reason).toBeNull()
  })

  it("outranks quota classification", () => {
    // A metric can be comfortably under its quota and still be broken. The
    // explicit threshold is the definite answer and must win.
    const p = projectMetric(
      metric({
        key: "health_ok",
        value: 0,
        limit: 100,
        cumulative: false,
        alert_when: { below: 1, severity: "critical", reason: "storefront down" },
      }),
      windowAt(dayOf(16))
    )
    expect(p.status).toBe("critical")
    expect(p.alert_reason).toBe("storefront down")
  })

  it("never fires on a metric the provider could not read", () => {
    // `value: null` means "we don't know", which must not be treated as a zero
    // and reported as an outage.
    const p = projectMetric(
      metric({
        value: null,
        limit: null,
        alert_when: { below: 1, severity: "critical", reason: "should not fire" },
      }),
      windowAt(dayOf(16))
    )
    expect(p.status).toBe("unknown")
    expect(p.alert_reason).toBeNull()
  })
})

describe("windowFrom", () => {
  it("uses the provider's reported cycle when present", () => {
    const w = windowFrom("2026-08-10T00:00:00Z", "2026-09-10T00:00:00Z", dayOf(20))
    expect(w.start.toISOString()).toBe("2026-08-10T00:00:00.000Z")
    expect(w.end.toISOString()).toBe("2026-09-10T00:00:00.000Z")
  })

  it("falls back to the calendar month when the provider reports no cycle", () => {
    // Cloudinary is the real case — it reports usage but not cycle boundaries.
    const w = windowFrom(null, null, dayOf(20))
    expect(w.start.toISOString()).toBe("2026-08-01T00:00:00.000Z")
    expect(w.end.toISOString()).toBe("2026-09-01T00:00:00.000Z")
  })

  it("falls back to the calendar month on an unparseable date", () => {
    const w = windowFrom("not-a-date", "also-not-a-date", dayOf(20))
    expect(w.start.toISOString()).toBe("2026-08-01T00:00:00.000Z")
  })
})
