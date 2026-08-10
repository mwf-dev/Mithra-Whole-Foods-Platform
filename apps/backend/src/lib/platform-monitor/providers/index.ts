import type { PlatformProvider, ProviderContext } from "../types"
import vercel from "./vercel"
import railway from "./railway"
import neon from "./neon"
import cloudinary from "./cloudinary"
import stripe from "./stripe"
import sendgrid from "./sendgrid"
import backend from "./backend"
import storefront from "./storefront"

/**
 * The provider registry.
 *
 * Order is display order in the admin UI: the two internal probes first
 * (they need no setup and answer "is the site up?"), then the paid platforms in
 * roughly descending order of how much they can cost you by surprise.
 */
export const PROVIDERS: PlatformProvider[] = [
  storefront,
  backend,
  railway,
  neon,
  vercel,
  cloudinary,
  stripe,
  sendgrid,
]

export const PROVIDER_IDS = PROVIDERS.map((p) => p.id)

export function getProvider(id: string): PlatformProvider | undefined {
  return PROVIDERS.find((p) => p.id === id)
}

/**
 * Merge stored values with env fallbacks.
 *
 * Stored values win. The env fallback exists so a deployment that already has
 * `CLOUDINARY_API_SECRET` or `STRIPE_API_KEY` set works with zero configuration
 * — and so the portal can be brought up before the client has finished issuing
 * read-only tokens. `source` tells the UI which of the two it is showing, which
 * matters: "configured via env" cannot be changed from this screen.
 */
export function resolveContext(
  provider: PlatformProvider,
  stored: { credentials: Record<string, string>; settings: Record<string, string> },
  container?: any
): ProviderContext & { sources: Record<string, "stored" | "env"> } {
  const credentials: Record<string, string> = {}
  const settings: Record<string, string> = {}
  const sources: Record<string, "stored" | "env"> = {}

  for (const field of provider.credential_fields) {
    const fromStore = stored.credentials?.[field.key]
    if (fromStore) {
      credentials[field.key] = fromStore
      sources[field.key] = "stored"
      continue
    }
    const fromEnv = field.env ? process.env[field.env] : undefined
    if (fromEnv) {
      credentials[field.key] = fromEnv
      sources[field.key] = "env"
    }
  }

  for (const field of provider.setting_fields) {
    const fromStore = stored.settings?.[field.key]
    if (fromStore) {
      settings[field.key] = fromStore
      sources[field.key] = "stored"
      continue
    }
    const fromEnv = field.env ? process.env[field.env] : undefined
    if (fromEnv) {
      settings[field.key] = fromEnv
      sources[field.key] = "env"
    }
  }

  return { credentials, settings, container, sources }
}

/** Which required fields are still missing, for the UI's "needs setup" state. */
export function missingFields(
  provider: PlatformProvider,
  ctx: ProviderContext
): string[] {
  const missing: string[] = []
  for (const f of provider.credential_fields) {
    if (f.required && !ctx.credentials[f.key]) {
      missing.push(f.label)
    }
  }
  for (const f of provider.setting_fields) {
    if (f.required && !ctx.settings[f.key]) {
      missing.push(f.label)
    }
  }
  return missing
}

/**
 * Provider metadata safe to send to the browser — the field *schemas*, never
 * the values. The admin UI builds its forms from this, so adding a provider
 * requires no frontend change.
 */
export function describeProviders() {
  return PROVIDERS.map((p) => ({
    id: p.id,
    label: p.label,
    category: p.category,
    docs_url: p.docs_url,
    setup_hint: p.setup_hint,
    builtin: Boolean(p.builtin),
    credential_fields: p.credential_fields,
    setting_fields: p.setting_fields,
  }))
}
