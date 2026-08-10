/**
 * Minimal HTTP helper for vendor API calls.
 *
 * Deliberately not `resilient-fetch` (that lives in the storefront) and
 * deliberately not retrying: this runs inside a scheduled job against five
 * third-party APIs, and a retry storm against a rate-limited vendor endpoint is
 * how a monitoring tool gets its own token throttled. One attempt, hard
 * timeout, structured failure.
 */

const DEFAULT_TIMEOUT_MS = 12_000

export type ApiResponse<T> = {
  ok: boolean
  status: number
  data: T | null
  /** Short, renderable failure reason. Never contains request headers. */
  error: string | null
  latency_ms: number
}

export async function apiGet<T = any>(
  url: string,
  init: { headers?: Record<string, string>; timeoutMs?: number } = {}
): Promise<ApiResponse<T>> {
  return apiRequest<T>(url, { ...init, method: "GET" })
}

export async function apiRequest<T = any>(
  url: string,
  init: {
    method?: string
    headers?: Record<string, string>
    body?: string
    timeoutMs?: number
  } = {}
): Promise<ApiResponse<T>> {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    init.timeoutMs ?? DEFAULT_TIMEOUT_MS
  )
  const started = Date.now()

  try {
    const res = await fetch(url, {
      method: init.method ?? "GET",
      headers: { accept: "application/json", ...(init.headers ?? {}) },
      body: init.body,
      signal: controller.signal,
    })

    const latency_ms = Date.now() - started
    const text = await res.text()

    let data: T | null = null
    try {
      data = text ? (JSON.parse(text) as T) : null
    } catch {
      // Some vendors return HTML on auth failure. Keep the status, drop the body.
      data = null
    }

    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        data,
        error: summariseError(res.status, text),
        latency_ms,
      }
    }

    return { ok: true, status: res.status, data, error: null, latency_ms }
  } catch (e: any) {
    const latency_ms = Date.now() - started
    const aborted = e?.name === "AbortError"
    return {
      ok: false,
      status: 0,
      data: null,
      error: aborted
        ? `timed out after ${init.timeoutMs ?? DEFAULT_TIMEOUT_MS}ms`
        : `network error: ${e?.message ?? "unknown"}`,
      latency_ms,
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Turn a vendor error body into one short line.
 *
 * Truncated hard: some APIs return a full HTML error page, and this string ends
 * up in a database column and an admin table cell.
 */
function summariseError(status: number, body: string): string {
  const trimmed = (body || "").trim()

  let detail = ""
  try {
    const parsed = JSON.parse(trimmed)
    detail =
      parsed?.error?.message ||
      parsed?.error?.description ||
      parsed?.message ||
      parsed?.errors?.[0]?.message ||
      (typeof parsed?.error === "string" ? parsed.error : "")
  } catch {
    detail = trimmed.startsWith("<") ? "" : trimmed
  }

  const suffix = detail ? ` — ${detail.slice(0, 180)}` : ""
  return `HTTP ${status}${suffix}`
}

export function basicAuth(user: string, pass: string): string {
  return `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`
}

export const bytesToGb = (bytes: number): number =>
  Math.round((bytes / 1024 ** 3) * 1000) / 1000

export const round = (n: number, dp = 2): number => {
  const f = 10 ** dp
  return Math.round(n * f) / f
}
