import { apiGet, basicAuth, round } from "../http"
import type { PlatformProvider, Metric, UsageResult } from "../types"

/**
 * Cloudinary — product and homepage imagery.
 *
 * `GET /v1_1/{cloud}/usage` returns every counter with its own plan `limit` and
 * `used_percent`, which makes this the one provider where the dashboard's
 * limits are authoritative without anyone configuring a budget.
 *
 * Cloudinary's free plan is metered in **credits** (1 credit ≈ 1000
 * transformations ≈ 1 GB storage ≈ 1 GB bandwidth), so `credits` is the number
 * that actually decides whether the account gets throttled — the individual
 * counters are secondary. It is listed first for that reason.
 *
 * These are the same credentials already used for uploads
 * (`CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`), so this provider works with
 * zero setup on a deployment that already has image uploads working.
 */

type Counter = { usage?: number; limit?: number; used_percent?: number }

type CloudinaryUsage = {
  plan?: string
  last_updated?: string
  date_requested?: string
  credits?: Counter
  objects?: Counter
  bandwidth?: Counter
  storage?: Counter
  requests?: number
  transformations?: Counter
  derived_resources?: number
}

const cloudinary: PlatformProvider = {
  id: "cloudinary",
  label: "Cloudinary",
  category: "media",
  docs_url: "https://cloudinary.com/documentation/admin_api#usage",
  setup_hint:
    "Cloudinary → Settings → API Keys. The backend already uses these for uploads, so the existing CLOUDINARY_* env vars are picked up automatically.",
  credential_fields: [
    {
      key: "api_key",
      label: "API key",
      type: "password",
      required: true,
      env: "CLOUDINARY_API_KEY",
    },
    {
      key: "api_secret",
      label: "API secret",
      type: "password",
      required: true,
      env: "CLOUDINARY_API_SECRET",
    },
  ],
  setting_fields: [
    {
      key: "cloud_name",
      label: "Cloud name",
      type: "text",
      required: true,
      env: "CLOUDINARY_CLOUD_NAME",
    },
  ],

  async test(ctx) {
    const res = await fetchUsage(ctx)
    if (!res.ok) {
      return { ok: false, detail: res.error!, latency_ms: res.latency_ms }
    }
    return {
      ok: true,
      detail: `Connected to "${ctx.settings.cloud_name}" (${res.data?.plan ?? "unknown"} plan)`,
      latency_ms: res.latency_ms,
    }
  },

  async usage(ctx): Promise<UsageResult> {
    const res = await fetchUsage(ctx)
    if (!res.ok || !res.data) {
      throw new Error(res.error ?? "Cloudinary returned no usage")
    }

    const u = res.data
    const metrics: Metric[] = [
      counter("credits", "Credits (cycle)", u.credits, "credits", true),
      counter("bandwidth_gb", "Bandwidth (cycle)", u.bandwidth, "gb", true, 1024 ** 3),
      counter("storage_gb", "Storage", u.storage, "gb", false, 1024 ** 3),
      counter(
        "transformations",
        "Transformations (cycle)",
        u.transformations,
        "count",
        true
      ),
      {
        key: "assets",
        label: "Stored assets",
        value: typeof u.objects?.usage === "number" ? u.objects.usage : null,
        unit: "count",
        limit: u.objects?.limit ?? null,
        cumulative: false,
      },
    ]

    // Cloudinary reports usage for the current *plan cycle* but does not return
    // its boundaries; the `date_requested` field is only the read time. Falling
    // back to the calendar month keeps the run-rate maths defined, and the
    // warning stops anyone reading the projection as gospel on a plan whose
    // cycle starts mid-month.
    const now = new Date()
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))

    return {
      cycle_start: start.toISOString(),
      cycle_end: end.toISOString(),
      metrics,
      cost_estimate_usd: null,
      warnings: [
        "Cloudinary does not report its billing-cycle boundaries; projections assume a calendar month.",
      ],
    }
  },
}

async function fetchUsage(ctx: {
  credentials: Record<string, string>
  settings: Record<string, string>
}) {
  const { api_key, api_secret } = ctx.credentials
  const cloud = ctx.settings.cloud_name

  if (!api_key || !api_secret) {
    return {
      ok: false as const,
      data: null,
      error: "API key/secret not configured",
      latency_ms: 0,
      status: 0,
    }
  }
  if (!cloud) {
    return {
      ok: false as const,
      data: null,
      error: "Cloud name not configured",
      latency_ms: 0,
      status: 0,
    }
  }

  return apiGet<CloudinaryUsage>(
    `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/usage`,
    { headers: { authorization: basicAuth(api_key, api_secret) } }
  )
}

/**
 * Cloudinary reports bandwidth/storage in bytes and everything else in whole
 * units, so the caller supplies the divisor rather than this guessing from the
 * key name.
 */
function counter(
  key: string,
  label: string,
  c: Counter | undefined,
  unit: Metric["unit"],
  cumulative: boolean,
  divisor = 1
): Metric {
  const dp = divisor === 1 ? 2 : 3
  return {
    key,
    label,
    value: typeof c?.usage === "number" ? round(c.usage / divisor, dp) : null,
    unit,
    limit: typeof c?.limit === "number" ? round(c.limit / divisor, dp) : null,
    cumulative,
  }
}

export default cloudinary
