/**
 * The contract every platform adapter implements.
 *
 * The whole design constraint here is that vendor usage APIs are *unreliable in
 * shape and availability*: they differ per plan, some are undocumented, some
 * require a team-scoped token the client may not have issued. So an adapter is
 * never allowed to throw its way out of a collection run — it returns a
 * `UsageResult` in which individual metrics may be marked `unavailable`, with a
 * human-readable reason. A dashboard that says "Vercel bandwidth: unavailable,
 * token lacks team scope" is useful; one that shows a blank card is not.
 */

/** Unit of a metric value. Drives formatting in the admin UI. */
export type MetricUnit =
  | "gb"
  | "gb_hours"
  | "hours"
  | "count"
  | "usd"
  | "percent"
  | "ms"
  | "credits"

export type Metric = {
  /** Stable machine key, e.g. "bandwidth_gb". Budgets and alerts join on this. */
  key: string
  label: string
  /** `null` means the provider could not give us this number — see `note`. */
  value: number | null
  unit: MetricUnit
  /** Plan limit as reported by the provider, when it reports one. */
  limit?: number | null
  /**
   * Metrics that only ever grow within a billing cycle (bandwidth, compute
   * hours) can be run-rate projected. Point-in-time metrics (storage size,
   * current RAM) cannot — projecting them produces nonsense.
   */
  cumulative?: boolean
  note?: string
  /**
   * Threshold for metrics that have no quota to measure against.
   *
   * Without this, the checks that matter most here are invisible: "Stripe
   * webhook verification: 0", "storefront healthy: 0" and "failed charges: 3"
   * all have no `limit`, so limit-based classification calls them `unknown` and
   * the dashboard renders them as calmly as a healthy row. A boolean flag at
   * the wrong value is not an unknown — it is the answer.
   */
  alert_when?: {
    /** Raise when the value is strictly greater than this. */
    above?: number
    /** Raise when the value is strictly less than this. */
    below?: number
    severity: "warning" | "critical"
    /** Human-readable cause, used verbatim as the alert message. */
    reason: string
  }
}

export type UsageResult = {
  cycle_start: string | null
  cycle_end: string | null
  metrics: Metric[]
  cost_estimate_usd: number | null
  /** Non-fatal problems worth showing next to the numbers. */
  warnings?: string[]
}

export type HealthResult = {
  ok: boolean
  /** One line, safe to render. Never include the credential itself. */
  detail: string
  latency_ms?: number
}

export type CredentialField = {
  key: string
  label: string
  type: "password" | "text"
  required: boolean
  placeholder?: string
  help?: string
  /** Env var consulted when the field is not set on the connection row. */
  env?: string
}

export type SettingField = Omit<CredentialField, "type"> & {
  type: "text"
}

export type ProviderCategory = "hosting" | "database" | "media" | "payments" | "email" | "internal"

export type PlatformProvider = {
  id: string
  label: string
  category: ProviderCategory
  /** Shown in the UI so an operator knows where to mint the token. */
  docs_url: string
  /** How to get a read-only credential, in one or two sentences. */
  setup_hint: string
  credential_fields: CredentialField[]
  setting_fields: SettingField[]
  /**
   * Providers whose credentials come entirely from the backend's own env/runtime
   * (the storefront ping, the backend's own meter). They are always present in
   * the dashboard and cannot be deleted.
   */
  builtin?: boolean
  test: (ctx: ProviderContext) => Promise<HealthResult>
  usage: (ctx: ProviderContext) => Promise<UsageResult>
}

export type ProviderContext = {
  /** Merged credential bag: stored values first, env fallback second. */
  credentials: Record<string, string>
  settings: Record<string, string>
  /**
   * Only the `builtin` providers use this — they measure *this* application
   * (its own request meter, its own database) rather than a vendor API, and so
   * need to resolve services. External adapters must ignore it: a vendor
   * adapter that reaches into the container is one that cannot be tested in
   * isolation.
   */
  container?: any
}
