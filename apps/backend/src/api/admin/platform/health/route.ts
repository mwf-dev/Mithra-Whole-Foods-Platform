import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { testConnection } from "../../../../lib/platform-monitor/connections"
import { PROVIDERS } from "../../../../lib/platform-monitor/providers"
import { canEncrypt } from "../../../../lib/platform-monitor/crypto"

/**
 * GET /admin/platform/health — verify every endpoint and integration, live.
 *
 * This is the "is anything quietly broken?" button. It runs three families of
 * check in parallel:
 *
 *  1. **Platform connectivity** — one `test()` per provider (Vercel, Railway,
 *     Neon, Cloudinary, Stripe, SendGrid) plus the two internal probes.
 *  2. **Runtime configuration** — the things that are *not* errors and produce
 *     no logs, but silently disable a feature. This project has a documented
 *     history of exactly that failure mode: `SENDGRID_API_KEY` unset means order
 *     emails never send and no subscriber ever complains;
 *     `STRIPE_WEBHOOK_SECRET` unset means webhook signatures are not verified
 *     while payments keep working. Both are checked here by name.
 *  3. **Commerce readiness** — the store-level data that has to exist for a
 *     checkout to complete at all: a region, a stock location, a shipping
 *     option, a sales channel with products. A perfectly healthy backend with
 *     no shipping option is a store that cannot take an order.
 *
 * Results are never cached: the whole value is that the numbers are true *now*.
 * Expect this route to take a few seconds — it is operator-triggered, not on a
 * render path.
 *
 * `?scope=config` skips the outbound vendor calls when you only want (2) + (3).
 */

export type Check = {
  id: string
  group: "platform" | "configuration" | "commerce"
  label: string
  status: "pass" | "warn" | "fail" | "skip"
  detail: string
  /** What to do about it. Present only when the check is not passing. */
  remedy?: string
  latency_ms?: number
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const configOnly = req.query.scope === "config"

  const [platform, configuration, commerce] = await Promise.all([
    configOnly ? Promise.resolve<Check[]>([]) : platformChecks(req.scope),
    configurationChecks(),
    commerceChecks(req.scope),
  ])

  const checks = [...platform, ...configuration, ...commerce]
  const counts = {
    pass: checks.filter((c) => c.status === "pass").length,
    warn: checks.filter((c) => c.status === "warn").length,
    fail: checks.filter((c) => c.status === "fail").length,
    skip: checks.filter((c) => c.status === "skip").length,
  }

  res.json({
    checked_at: new Date().toISOString(),
    status: counts.fail ? "fail" : counts.warn ? "warn" : "pass",
    counts,
    checks,
  })
}

async function platformChecks(scope: any): Promise<Check[]> {
  // Parallel: eight sequential vendor round trips would make this route feel
  // broken. Each `testConnection` already contains its own failure handling.
  const results = await Promise.all(
    PROVIDERS.map(async (provider): Promise<Check> => {
      const result = await testConnection(scope, provider.id, { persist: true })
      const unconfigured = result.detail.startsWith("Not configured")

      return {
        id: `platform.${provider.id}`,
        group: "platform",
        label: provider.label,
        status: result.ok ? "pass" : unconfigured ? "skip" : "fail",
        detail: result.detail,
        remedy: unconfigured ? provider.setup_hint : undefined,
        latency_ms: result.latency_ms,
      }
    })
  )

  return results
}

function configurationChecks(): Check[] {
  const checks: Check[] = []

  const flag = (
    id: string,
    label: string,
    ok: boolean,
    passDetail: string,
    failDetail: string,
    remedy: string,
    severity: "warn" | "fail" = "fail"
  ) => {
    checks.push({
      id,
      group: "configuration",
      label,
      status: ok ? "pass" : severity,
      detail: ok ? passDetail : failDetail,
      remedy: ok ? undefined : remedy,
    })
  }

  flag(
    "config.stripe_webhook_secret",
    "Stripe webhook signature verification",
    Boolean(process.env.STRIPE_WEBHOOK_SECRET),
    "STRIPE_WEBHOOK_SECRET is set",
    "STRIPE_WEBHOOK_SECRET is unset — /hooks/payment/stripe_stripe accepts unsigned payloads",
    "Stripe → Developers → Webhooks → your endpoint → Signing secret. Set STRIPE_WEBHOOK_SECRET on the backend and redeploy."
  )

  flag(
    "config.stripe_api_key",
    "Stripe payments enabled",
    Boolean(process.env.STRIPE_API_KEY),
    process.env.STRIPE_API_KEY?.startsWith("sk_live")
      ? "Live keys — real payments"
      : "Test keys — no real money will settle",
    "STRIPE_API_KEY is unset — the payment module is not registered and card checkout is unavailable",
    "Set STRIPE_API_KEY on the backend."
  )

  flag(
    "config.sendgrid",
    "Transactional email",
    Boolean(process.env.SENDGRID_API_KEY),
    "SENDGRID_API_KEY is set — order and shipment emails can send",
    "SENDGRID_API_KEY is unset — order/shipment subscribers run and silently send nothing",
    "Set SENDGRID_API_KEY and SENDGRID_FROM_EMAIL, plus the SENDGRID_*_TEMPLATE_ID variables."
  )

  flag(
    "config.sendgrid_templates",
    "Email templates configured",
    Boolean(
      process.env.SENDGRID_ORDER_PLACED_TEMPLATE_ID &&
        process.env.SENDGRID_ORDER_SHIPPED_TEMPLATE_ID
    ),
    "Order-placed and order-shipped templates are set",
    "One or both SendGrid dynamic template ids are unset — those emails will not render",
    "Create the templates in SendGrid and set SENDGRID_ORDER_PLACED_TEMPLATE_ID / SENDGRID_ORDER_SHIPPED_TEMPLATE_ID.",
    "warn"
  )

  flag(
    "config.file_storage",
    "Durable file storage",
    Boolean(process.env.S3_BUCKET || process.env.CLOUDINARY_CLOUD_NAME),
    process.env.S3_BUCKET ? "S3 provider active" : "Cloudinary provider active",
    "No file provider configured — uploads go to the container's local disk and are lost on every deploy",
    "Set CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET."
  )

  flag(
    "config.storefront_proxy_secret",
    "Per-shopper rate limiting",
    Boolean(process.env.STOREFRONT_PROXY_SECRET),
    "STOREFRONT_PROXY_SECRET is set — /store/* is limited per shopper",
    "STOREFRONT_PROXY_SECRET is unset — the /store/* limit (150/min) is a site-wide ceiling shared by every shopper",
    "Generate a secret and set it identically on the backend and the storefront.",
    "warn"
  )

  flag(
    "config.redis",
    "Redis cache / event bus",
    Boolean(process.env.REDIS_URL) || process.env.NODE_ENV === "development",
    process.env.REDIS_URL
      ? "REDIS_URL is set"
      : "Development mode — in-memory cache is expected",
    "REDIS_URL is unset in a non-development environment — cache, events and workflows are per-instance and will diverge if you scale past one container",
    "Provision Redis and set REDIS_URL.",
    "warn"
  )

  flag(
    "config.observability",
    "Error tracking",
    Boolean(process.env.SENTRY_DSN),
    "SENTRY_DSN is set",
    "SENTRY_DSN is unset — backend errors are logged to stdout only",
    "Set SENTRY_DSN. See docs/OBSERVABILITY_SETUP.md.",
    "warn"
  )

  flag(
    "config.monitor_secret",
    "Credential encryption",
    canEncrypt(),
    "A secret is available to encrypt stored platform tokens",
    "No PLATFORM_MONITOR_SECRET / COOKIE_SECRET / JWT_SECRET — platform tokens cannot be stored from the admin UI",
    "Set PLATFORM_MONITOR_SECRET on the backend."
  )

  return checks
}

/**
 * Store-level readiness.
 *
 * These read the live database, so they answer "can a shopper actually check
 * out" rather than "is the process running". Each one maps to a real failure
 * this project has hit or is exposed to.
 */
async function commerceChecks(scope: any): Promise<Check[]> {
  const checks: Check[] = []
  const query = scope.resolve(ContainerRegistrationKeys.QUERY)

  const add = (
    id: string,
    label: string,
    status: Check["status"],
    detail: string,
    remedy?: string
  ) => checks.push({ id, group: "commerce", label, status, detail, remedy })

  // Regions — a store with no region cannot price anything.
  try {
    const { data: regions } = await query.graph({
      entity: "region",
      fields: ["id", "name", "currency_code"],
    })
    add(
      "commerce.regions",
      "Regions",
      regions.length ? "pass" : "fail",
      regions.length
        ? regions.map((r: any) => `${r.name} (${r.currency_code})`).join(", ")
        : "No region configured — the storefront cannot resolve prices",
      regions.length ? undefined : "Create a region in Settings → Regions."
    )
  } catch (e: any) {
    add("commerce.regions", "Regions", "fail", `Query failed: ${e?.message}`)
  }

  // Shipping options — the documented gap: no fulfillment provider is
  // registered, so this is entirely manual and easy to leave empty.
  try {
    const { data: options } = await query.graph({
      entity: "shipping_option",
      fields: ["id", "name", "shipping_profile_id"],
    })
    add(
      "commerce.shipping_options",
      "Shipping options",
      options.length ? "pass" : "fail",
      options.length
        ? `${options.length} option(s): ${options.map((o: any) => o.name).join(", ")}`
        : "No shipping option — checkout cannot complete the delivery step",
      options.length
        ? undefined
        : "Settings → Locations & Shipping. See docs/SHIPPING_AUTOMATION_RESEARCH.md."
    )
  } catch (e: any) {
    add("commerce.shipping_options", "Shipping options", "fail", `Query failed: ${e?.message}`)
  }

  // Stock locations.
  try {
    const { data: locations } = await query.graph({
      entity: "stock_location",
      fields: ["id", "name"],
    })
    add(
      "commerce.stock_locations",
      "Stock locations",
      locations.length ? "pass" : "fail",
      locations.length
        ? locations.map((l: any) => l.name).join(", ")
        : "No stock location — nothing can be fulfilled",
      locations.length ? undefined : "Settings → Locations & Shipping → Create location."
    )
  } catch (e: any) {
    add("commerce.stock_locations", "Stock locations", "fail", `Query failed: ${e?.message}`)
  }

  // Publishable key + sales channel: the storefront's `/store/*` calls 401
  // without a key linked to a channel that has products.
  try {
    const { data: keys } = await query.graph({
      entity: "api_key",
      fields: ["id", "title", "type", "revoked_at"],
    })
    const publishable = keys.filter(
      (k: any) => k.type === "publishable" && !k.revoked_at
    )
    add(
      "commerce.publishable_key",
      "Publishable API key",
      publishable.length ? "pass" : "fail",
      publishable.length
        ? `${publishable.length} active key(s)`
        : "No active publishable key — every storefront /store/* call will be rejected",
      publishable.length ? undefined : "Settings → Publishable API keys → Create."
    )
  } catch (e: any) {
    add("commerce.publishable_key", "Publishable API key", "skip", `Not readable: ${e?.message}`)
  }

  // Products actually published.
  try {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "status"],
    })
    const published = products.filter((p: any) => p.status === "published")
    add(
      "commerce.products",
      "Published products",
      published.length ? "pass" : "warn",
      `${published.length} published of ${products.length} total`,
      published.length ? undefined : "Publish at least one product."
    )
  } catch (e: any) {
    add("commerce.products", "Published products", "skip", `Not readable: ${e?.message}`)
  }

  // Payment providers actually registered in the running process.
  try {
    const payment = scope.resolve(Modules.PAYMENT)
    const providers = await payment.listPaymentProviders({})
    add(
      "commerce.payment_providers",
      "Payment providers",
      providers.length ? "pass" : "fail",
      providers.length
        ? providers.map((p: any) => p.id).join(", ")
        : "No payment provider registered — checkout cannot take money",
      providers.length ? undefined : "Set STRIPE_API_KEY, or enable the system provider."
    )
  } catch (e: any) {
    add(
      "commerce.payment_providers",
      "Payment providers",
      "fail",
      `Payment module not resolvable: ${e?.message}`,
      "STRIPE_API_KEY is probably unset — medusa-config.ts only registers the payment module when it is present."
    )
  }

  return checks
}
