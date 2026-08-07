import { afterEach, describe, expect, it, vi } from "vitest"
import {
  DEFAULT_RETRY_POLICY,
  backoffDelay,
  isRetryable,
  withResilience,
} from "./resilient-fetch"

/**
 * Tests for the retry/timeout wrapper that sits between every Medusa call and
 * the network (`@lib/config.ts` hooks `withResilience` into `sdk.client.fetch`).
 *
 * This logic is safety-critical, not cosmetic: get `isRetryable` wrong in one
 * direction and a rate-limit blip becomes a blank product grid again; get it
 * wrong in the other and a retried POST duplicates a cart line item or a
 * payment attempt. It was previously verified only by a throwaway script run
 * once by hand — this file is that script, committed, so CI catches a
 * regression before it ships.
 *
 * `@lib/observability/report` is mocked so these tests never touch Sentry
 * (there is no Next.js runtime here, and no DSN in CI) — but `statusOf` keeps
 * its real implementation via `importActual`, because `isRetryable` genuinely
 * depends on its behaviour and mocking it would test nothing.
 */

// `vi.mock` factories are hoisted above every import in this file, so any
// variable they close over must be declared through `vi.hoisted` — a plain
// `const` here would be a TDZ reference by the time the factory runs.
const { reportError } = vi.hoisted(() => ({ reportError: vi.fn() }))

// Hoisted by vitest above the imports above, so `resilient-fetch.ts` sees the
// mocked module the moment it imports `@lib/observability/report`.
vi.mock("@lib/observability/report", async (importActual) => {
  const actual =
    await importActual<typeof import("@lib/observability/report")>()
  return { ...actual, reportError }
})

afterEach(() => {
  vi.restoreAllMocks()
  reportError.mockClear()
})

/** Builds an error shaped like what the Medusa SDK / fetch actually throws. */
function httpError(status: number, extra: Record<string, unknown> = {}) {
  return Object.assign(new Error(`HTTP ${status}`), { status, ...extra })
}

function networkError() {
  return new Error("fetch failed")
}

// ---------------------------------------------------------------------------
// isRetryable — the decision table from the file's own docblock, as assertions.
// ---------------------------------------------------------------------------
describe("isRetryable", () => {
  it.each([
    ["429 on GET", httpError(429), "GET", true],
    ["429 on POST", httpError(429), "POST", true],
    ["429 on DELETE", httpError(429), "DELETE", true],
    ["429 on PUT", httpError(429), "PUT", true],
    ["503 on GET", httpError(503), "GET", true],
    ["502 on GET", httpError(502), "GET", true],
    ["504 on HEAD", httpError(504), "HEAD", true],
    ["503 on POST", httpError(503), "POST", false],
    ["502 on POST", httpError(502), "POST", false],
    ["504 on PUT", httpError(504), "PUT", false],
    ["503 on DELETE", httpError(503), "DELETE", false],
    ["500 on GET", httpError(500), "GET", false],
    ["500 on POST", httpError(500), "POST", false],
    ["400 on GET", httpError(400), "GET", false],
    ["404 on GET", httpError(404), "GET", false],
    ["401 on GET", httpError(401), "GET", false],
    ["network error on GET", networkError(), "GET", true],
    ["network error on HEAD", networkError(), "HEAD", true],
    ["network error on POST", networkError(), "POST", false],
    ["network error on PUT", networkError(), "PUT", false],
    ["network error on DELETE", networkError(), "DELETE", false],
    // Method omitted defaults to GET (read) — matters because callers that
    // forget to pass a method must fail toward "safe to retry", not away
    // from it, or a real omission would silently stop retrying reads.
    ["503, no method specified", httpError(503), undefined, true],
  ] as const)("%s -> retryable=%s", (_desc, error, method, expected) => {
    expect(isRetryable(error, method)).toBe(expected)
  })

  it("is case-insensitive on method", () => {
    expect(isRetryable(httpError(503), "get")).toBe(true)
    expect(isRetryable(httpError(503), "post")).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// backoffDelay — cap, jitter, and Retry-After handling
// ---------------------------------------------------------------------------
describe("backoffDelay", () => {
  const policy = { ...DEFAULT_RETRY_POLICY, baseDelayMs: 200, maxDelayMs: 2_000 }

  it("never exceeds maxDelayMs, across escalating attempts", () => {
    for (const attempt of [1, 2, 3, 4, 5, 10]) {
      for (let i = 0; i < 50; i++) {
        expect(backoffDelay(attempt, policy)).toBeLessThanOrEqual(
          policy.maxDelayMs
        )
      }
    }
  })

  it("is never negative", () => {
    expect(backoffDelay(1, policy)).toBeGreaterThanOrEqual(0)
  })

  it("uses full jitter — samples spread across the range, not a fixed value", () => {
    const samples = Array.from({ length: 200 }, () => backoffDelay(3, policy))
    const max = Math.max(...samples)
    const min = Math.min(...samples)
    // With 200 samples of Math.random() * ceiling, the spread should be wide.
    // A non-jittered implementation would return the same value every time.
    expect(max - min).toBeGreaterThan(policy.baseDelayMs)
  })

  it("grows exponentially with attempt number (ceiling before jitter)", () => {
    // Can't observe the ceiling directly since the result is randomised, but
    // the max of many samples at a later attempt should exceed the max at an
    // earlier one, up to the point both are capped by maxDelayMs.
    const attempt1Max = Math.max(
      ...Array.from({ length: 200 }, () => backoffDelay(1, policy))
    )
    const attempt3Max = Math.max(
      ...Array.from({ length: 200 }, () => backoffDelay(3, policy))
    )
    expect(attempt3Max).toBeGreaterThan(attempt1Max)
  })

  it("honours Retry-After in seconds", () => {
    expect(backoffDelay(1, policy, "1")).toBe(1_000)
    expect(backoffDelay(1, policy, "0")).toBe(0)
  })

  it("caps Retry-After at maxDelayMs — a hostile or misconfigured backend must not stall a render indefinitely", () => {
    expect(backoffDelay(1, policy, "9999")).toBe(policy.maxDelayMs)
  })

  it("ignores a malformed Retry-After and falls back to backoff", () => {
    const delay = backoffDelay(1, policy, "not-a-number")
    expect(delay).toBeLessThanOrEqual(policy.maxDelayMs)
    expect(delay).toBeGreaterThanOrEqual(0)
  })

  it("ignores a negative Retry-After", () => {
    const delay = backoffDelay(1, policy, "-5")
    expect(delay).toBeGreaterThanOrEqual(0)
  })
})

// ---------------------------------------------------------------------------
// withResilience — the actual retry loop, including timeout + AbortSignal
// wiring + the reporting hand-off.
// ---------------------------------------------------------------------------
describe("withResilience", () => {
  // Fast policy so the retry-path tests don't spend real wall-clock time
  // sleeping through backoff.
  const fastPolicy = {
    maxAttempts: 3,
    baseDelayMs: 1,
    maxDelayMs: 5,
    timeoutMs: 50,
  }

  it("returns the result on first success without retrying", async () => {
    const op = vi.fn().mockResolvedValue("ok")

    const result = await withResilience(op, { method: "GET", scope: "test" })

    expect(result).toBe("ok")
    expect(op).toHaveBeenCalledTimes(1)
    expect(reportError).not.toHaveBeenCalled()
  })

  it("retries a GET on 503 and succeeds on the second attempt", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(httpError(503))
      .mockResolvedValueOnce("recovered")

    const result = await withResilience(op, {
      method: "GET",
      scope: "test",
      policy: fastPolicy,
    })

    expect(result).toBe("recovered")
    expect(op).toHaveBeenCalledTimes(2)
    // A retry that ends in success is not an incident.
    expect(reportError).not.toHaveBeenCalled()
  })

  it("gives up after maxAttempts and throws the last error", async () => {
    const op = vi.fn().mockRejectedValue(httpError(503))

    await expect(
      withResilience(op, { method: "GET", scope: "test", policy: fastPolicy })
    ).rejects.toMatchObject({ status: 503 })

    expect(op).toHaveBeenCalledTimes(fastPolicy.maxAttempts)
  })

  it("never retries a 503 on POST — a write may have already landed", async () => {
    const op = vi.fn().mockRejectedValue(httpError(503))

    await expect(
      withResilience(op, {
        method: "POST",
        scope: "cart.add",
        policy: fastPolicy,
      })
    ).rejects.toMatchObject({ status: 503 })

    expect(op).toHaveBeenCalledTimes(1)
  })

  it("does retry a 429 on POST — rejected before the handler runs", async () => {
    const op = vi
      .fn()
      .mockRejectedValueOnce(httpError(429))
      .mockResolvedValueOnce("ok")

    const result = await withResilience(op, {
      method: "POST",
      scope: "cart.add",
      policy: fastPolicy,
    })

    expect(result).toBe("ok")
    expect(op).toHaveBeenCalledTimes(2)
  })

  it("never retries a deterministic 500, on GET or POST", async () => {
    const getOp = vi.fn().mockRejectedValue(httpError(500))
    const postOp = vi.fn().mockRejectedValue(httpError(500))

    await expect(
      withResilience(getOp, { method: "GET", scope: "t", policy: fastPolicy })
    ).rejects.toThrow()
    await expect(
      withResilience(postOp, { method: "POST", scope: "t", policy: fastPolicy })
    ).rejects.toThrow()

    expect(getOp).toHaveBeenCalledTimes(1)
    expect(postOp).toHaveBeenCalledTimes(1)
  })

  it("retries a network failure on GET but not on POST", async () => {
    const getOp = vi
      .fn()
      .mockRejectedValueOnce(networkError())
      .mockResolvedValueOnce("ok")
    const postOp = vi.fn().mockRejectedValue(networkError())

    await expect(
      withResilience(getOp, { method: "GET", scope: "t", policy: fastPolicy })
    ).resolves.toBe("ok")
    expect(getOp).toHaveBeenCalledTimes(2)

    await expect(
      withResilience(postOp, { method: "POST", scope: "t", policy: fastPolicy })
    ).rejects.toThrow()
    expect(postOp).toHaveBeenCalledTimes(1)
  })

  it("aborts a hung operation via the AbortSignal once timeoutMs elapses", async () => {
    const policy = { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, timeoutMs: 20 }
    let sawAbort = false

    const op = (signal: AbortSignal) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener("abort", () => {
          sawAbort = true
          reject(new Error("aborted"))
        })
      })

    await expect(
      withResilience(op, { method: "GET", scope: "t", policy })
    ).rejects.toThrow("aborted")

    expect(sawAbort).toBe(true)
  })

  describe("reporting", () => {
    it("reports once, only at final failure — not per retry", async () => {
      const op = vi.fn().mockRejectedValue(httpError(503))

      await expect(
        withResilience(op, { method: "GET", scope: "products.list", policy: fastPolicy })
      ).rejects.toThrow()

      expect(reportError).toHaveBeenCalledTimes(1)
      expect(reportError).toHaveBeenCalledWith(
        expect.objectContaining({ status: 503 }),
        expect.objectContaining({ scope: "products.list", level: "warning" })
      )
    })

    it("does not report an expected 401 (every signed-out shopper hits this)", async () => {
      const op = vi.fn().mockRejectedValue(httpError(401))

      await expect(
        withResilience(op, { method: "GET", scope: "customers.me", policy: fastPolicy })
      ).rejects.toThrow()

      expect(reportError).not.toHaveBeenCalled()
    })

    it("does not report an expected 404 (stale cart cookie)", async () => {
      const op = vi.fn().mockRejectedValue(httpError(404))

      await expect(
        withResilience(op, { method: "GET", scope: "cart.retrieve", policy: fastPolicy })
      ).rejects.toThrow()

      expect(reportError).not.toHaveBeenCalled()
    })

    it("reports a 429 — the shared rate-limit budget is exhausted", async () => {
      const policy = { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 1, timeoutMs: 50 }
      const op = vi.fn().mockRejectedValue(httpError(429))

      await expect(
        withResilience(op, { method: "GET", scope: "t", policy })
      ).rejects.toThrow()

      expect(reportError).toHaveBeenCalledTimes(1)
    })

    it("reports a network failure on a write (never retried, always worth knowing about)", async () => {
      const op = vi.fn().mockRejectedValue(networkError())

      await expect(
        withResilience(op, { method: "POST", scope: "cart.add", policy: fastPolicy })
      ).rejects.toThrow()

      expect(reportError).toHaveBeenCalledTimes(1)
    })
  })
})
