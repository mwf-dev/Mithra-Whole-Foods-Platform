/**
 * The meter carries module-level state (lifetime counters + a 60-slot ring
 * buffer), so every test re-imports the module through `jest.isolateModules`
 * to get a fresh process-like instance. Sharing one import across tests would
 * make assertions depend on execution order.
 */

type MetricsModule = typeof import("../request-metrics")

function freshModule(): MetricsModule {
  let mod!: MetricsModule
  jest.isolateModules(() => {
    mod = require("../request-metrics")
  })
  return mod
}

function record(
  mod: MetricsModule,
  path: string,
  overrides: { status?: number; durationMs?: number; bytesOut?: number } = {}
): void {
  mod.recordRequest({
    path,
    status: overrides.status ?? 200,
    durationMs: overrides.durationMs ?? 10,
    bytesOut: overrides.bytesOut ?? 100,
  })
}

describe("request-metrics", () => {
  describe("route classification", () => {
    it("buckets each known prefix into its own class", () => {
      const mod = freshModule()

      record(mod, "/health")
      record(mod, "/store/regions")
      record(mod, "/store/products/prod_1")
      record(mod, "/admin/orders")
      record(mod, "/auth/customer/emailpass")
      record(mod, "/hooks/payment/stripe_stripe")
      record(mod, "/app")
      record(mod, "/homepage")

      const { by_route_class } = mod.getMetrics().traffic

      expect(by_route_class.health.requests).toBe(1)
      expect(by_route_class.store.requests).toBe(2)
      expect(by_route_class.admin.requests).toBe(1)
      expect(by_route_class.auth.requests).toBe(1)
      expect(by_route_class.hooks.requests).toBe(1)
      expect(by_route_class["admin-ui"].requests).toBe(1)
      expect(by_route_class.homepage.requests).toBe(1)
    })

    it("does not let a prefix swallow an unrelated path that merely starts with the same letters", () => {
      const mod = freshModule()

      // `/storefront-callback` is not `/store/*`. A naive `startsWith("/store")`
      // would misattribute it and inflate the store bucket.
      record(mod, "/storefront-callback")
      record(mod, "/healthz")

      const { by_route_class } = mod.getMetrics().traffic
      expect(by_route_class.other.requests).toBe(2)
      expect(by_route_class.store).toBeUndefined()
      expect(by_route_class.health).toBeUndefined()
    })
  })

  describe("idle detection", () => {
    it("reports never-served when only health probes have arrived", () => {
      const mod = freshModule()

      // This is the exact production situation the meter must not misreport:
      // an uptime monitor pinging a backend that no shopper is using.
      record(mod, "/health")
      record(mod, "/health")

      const { traffic } = mod.getMetrics()
      expect(traffic.total_requests).toBe(2)
      expect(traffic.last_non_health_request_at).toBeNull()
      expect(traffic.idle_seconds).toBeNull()
    })

    it("starts the idle clock once real traffic arrives", () => {
      const mod = freshModule()

      record(mod, "/store/regions")

      const { traffic } = mod.getMetrics()
      expect(traffic.last_non_health_request_at).not.toBeNull()
      expect(traffic.idle_seconds).toBeGreaterThanOrEqual(0)
    })
  })

  describe("counters", () => {
    it("separates 5xx, 429 and slow requests", () => {
      const mod = freshModule()

      record(mod, "/store/products", { status: 200, durationMs: 50 })
      record(mod, "/store/products", { status: 500 })
      record(mod, "/store/products", { status: 429 })
      record(mod, "/store/products", { durationMs: 5_000 })

      const store = mod.getMetrics().traffic.by_route_class.store

      expect(store.requests).toBe(4)
      expect(store.errors_5xx).toBe(1)
      expect(store.rate_limited_429).toBe(1)
      expect(store.slow_over_1s).toBe(1)
    })

    it("treats exactly 1000ms as slow (the boundary is inclusive)", () => {
      const mod = freshModule()

      record(mod, "/store/a", { durationMs: 999 })
      record(mod, "/store/b", { durationMs: 1_000 })

      expect(mod.getMetrics().traffic.by_route_class.store.slow_over_1s).toBe(1)
    })

    it("sums egress bytes and averages latency", () => {
      const mod = freshModule()

      record(mod, "/store/a", { durationMs: 100, bytesOut: 1_000 })
      record(mod, "/store/b", { durationMs: 300, bytesOut: 3_000 })

      const store = mod.getMetrics().traffic.by_route_class.store
      expect(store.bytes_out).toBe(4_000)
      expect(store.avg_ms).toBe(200)
    })

    it("groups status codes into classes", () => {
      const mod = freshModule()

      record(mod, "/store/a", { status: 200 })
      record(mod, "/store/b", { status: 204 })
      record(mod, "/store/c", { status: 404 })
      record(mod, "/store/d", { status: 503 })

      expect(mod.getMetrics().traffic.by_status_class).toEqual({
        "2xx": 2,
        "4xx": 1,
        "5xx": 1,
      })
    })

    it("reports zero averages rather than NaN before any traffic", () => {
      const mod = freshModule()

      const { traffic } = mod.getMetrics()
      expect(traffic.totals.avg_ms).toBe(0)
      expect(traffic.total_requests).toBe(0)
      expect(traffic.requests_last_hour).toBe(0)
    })
  })

  describe("rolling window", () => {
    it("counts a burst within the same minute and records the peak", () => {
      const mod = freshModule()

      for (let i = 0; i < 25; i++) {
        record(mod, "/store/products")
      }

      const { traffic } = mod.getMetrics()
      expect(traffic.requests_last_hour).toBe(25)
      expect(traffic.busiest_minute_last_hour).toBe(25)
      expect(traffic.peak_requests_per_minute_since_boot).toBe(25)
    })

    it("drops requests older than the hour window from the rolling count", () => {
      const mod = freshModule()
      const realNow = Date.now

      try {
        // Two hours ago: lands in a ring slot that must be treated as stale,
        // not replayed. This is the bug the parallel stamp array prevents.
        Date.now = () => realNow() - 2 * 60 * 60 * 1000
        record(mod, "/store/old")

        Date.now = realNow
        record(mod, "/store/new")

        const { traffic } = mod.getMetrics()
        expect(traffic.total_requests).toBe(2)
        expect(traffic.requests_last_hour).toBe(1)
      } finally {
        Date.now = realNow
      }
    })
  })

  describe("resource snapshot", () => {
    it("reports live process memory and CPU", () => {
      const mod = freshModule()
      const { resources } = mod.getMetrics()

      expect(resources.rss_mb).toBeGreaterThan(0)
      expect(resources.heap_used_mb).toBeGreaterThan(0)
      expect(resources.cpu_seconds_total).toBeGreaterThanOrEqual(0)
      expect(resources.avg_vcpu_since_boot).toBeGreaterThanOrEqual(0)
    })
  })

  describe("robustness", () => {
    it("never throws on a malformed record", () => {
      const mod = freshModule()

      expect(() =>
        mod.recordRequest({
          path: undefined as unknown as string,
          status: NaN,
          durationMs: NaN,
          bytesOut: NaN,
        })
      ).not.toThrow()
    })
  })

  describe("heartbeat", () => {
    it("logs a usage line and only ever starts one timer", () => {
      jest.useFakeTimers()
      const log = jest.spyOn(console, "log").mockImplementation(() => {})

      try {
        const mod = freshModule()

        mod.startUsageHeartbeat(1_000)
        // A second call must be a no-op — the middleware invokes it on every
        // request, and a timer per request would be a leak.
        mod.startUsageHeartbeat(1_000)

        record(mod, "/store/regions")
        jest.advanceTimersByTime(1_000)

        expect(log).toHaveBeenCalledTimes(1)
        expect(log.mock.calls[0][0]).toContain("[usage]")
        expect(log.mock.calls[0][0]).toContain("req_total=1")
      } finally {
        log.mockRestore()
        jest.useRealTimers()
      }
    })
  })
})
