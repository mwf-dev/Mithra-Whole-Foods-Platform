import { PLATFORM_MONITOR_MODULE } from "../../modules/platform-monitor"
import { canEncrypt, decryptJson, encryptJson, maskSecret } from "./crypto"
import {
  PROVIDERS,
  describeProviders,
  getProvider,
  missingFields,
  resolveContext,
} from "./providers"
import type { HealthResult, PlatformProvider } from "./types"

/**
 * The seam between stored connection rows and the provider adapters.
 *
 * Every route and the scheduled job go through here rather than touching the
 * module service directly, because three rules have to hold everywhere and are
 * easy to forget in one place:
 *
 *   1. Secrets are decrypted as late as possible and never returned outward.
 *   2. A provider with no row still appears in the dashboard, in a
 *      "not configured" state — otherwise the operator cannot tell the
 *      difference between "Neon is fine" and "nobody ever set Neon up".
 *   3. Env vars are a valid configuration source, so "no row" does not mean
 *      "no credentials".
 */

export type ConnectionState = {
  provider: string
  label: string
  category: PlatformProvider["category"]
  builtin: boolean
  docs_url: string
  setup_hint: string
  /** Row id, or null when this provider has never been saved. */
  id: string | null
  enabled: boolean
  configured: boolean
  missing_fields: string[]
  /** Masked previews keyed by field, plus where each value came from. */
  credential_preview: Record<string, string | null>
  field_sources: Record<string, "stored" | "env">
  settings: Record<string, string>
  last_status: string
  last_status_detail: string | null
  last_checked_at: Date | null
  last_collected_at: Date | null
}

type Row = {
  id: string
  provider: string
  label: string
  credentials_encrypted: string | null
  settings: Record<string, string>
  enabled: boolean
  last_status: string
  last_status_detail: string | null
  last_checked_at: Date | null
  last_collected_at: Date | null
}

function service(container: any) {
  return container.resolve(PLATFORM_MONITOR_MODULE)
}

async function loadRows(container: any): Promise<Map<string, Row>> {
  const rows: Row[] = await service(container).listPlatformConnections({})
  return new Map(rows.map((r) => [r.provider, r]))
}

/**
 * Decrypted credentials for one provider, merged with env fallbacks.
 * Internal only — the return value must never reach an HTTP response.
 */
export function contextFor(
  provider: PlatformProvider,
  row: Row | undefined,
  container?: any
) {
  const stored = row?.credentials_encrypted
    ? decryptJson(row.credentials_encrypted) ?? {}
    : {}

  return resolveContext(
    provider,
    { credentials: stored, settings: (row?.settings as Record<string, string>) ?? {} },
    container
  )
}

/** Everything the dashboard needs to render the connections screen. */
export async function listConnectionState(
  container: any
): Promise<ConnectionState[]> {
  const rows = await loadRows(container)

  return PROVIDERS.map((provider) => {
    const row = rows.get(provider.id)
    const ctx = contextFor(provider, row, container)
    const missing = missingFields(provider, ctx)

    const credential_preview: Record<string, string | null> = {}
    for (const field of provider.credential_fields) {
      credential_preview[field.key] = maskSecret(ctx.credentials[field.key])
    }

    return {
      provider: provider.id,
      label: row?.label || provider.label,
      category: provider.category,
      builtin: Boolean(provider.builtin),
      docs_url: provider.docs_url,
      setup_hint: provider.setup_hint,
      id: row?.id ?? null,
      enabled: row ? row.enabled : true,
      configured: missing.length === 0,
      missing_fields: missing,
      credential_preview,
      field_sources: ctx.sources,
      settings: ctx.settings,
      last_status: row?.last_status ?? "unconfigured",
      last_status_detail: row?.last_status_detail ?? null,
      last_checked_at: row?.last_checked_at ?? null,
      last_collected_at: row?.last_collected_at ?? null,
    }
  })
}

export type UpsertInput = {
  provider: string
  label?: string
  /** Only the fields the operator actually retyped. Blanks are ignored. */
  credentials?: Record<string, string>
  settings?: Record<string, string>
  enabled?: boolean
}

/**
 * Create or update one connection.
 *
 * Credential merge semantics matter: the UI renders masked previews, so an
 * untouched password input posts back an empty string. Treating that as "clear
 * the token" would silently break monitoring every time someone edited a
 * project id. Empty values are therefore *ignored*; clearing a credential is a
 * separate, explicit `clear_credentials` action.
 */
export async function upsertConnection(
  container: any,
  input: UpsertInput
): Promise<ConnectionState> {
  const provider = getProvider(input.provider)
  if (!provider) {
    throw new Error(`Unknown provider "${input.provider}"`)
  }

  const svc = service(container)
  const rows = await loadRows(container)
  const existing = rows.get(provider.id)

  const allowedCredKeys = new Set(provider.credential_fields.map((f) => f.key))
  const allowedSettingKeys = new Set(provider.setting_fields.map((f) => f.key))

  const nextCredentials = existing?.credentials_encrypted
    ? decryptJson(existing.credentials_encrypted) ?? {}
    : {}

  let credentialsTouched = false
  for (const [key, value] of Object.entries(input.credentials ?? {})) {
    if (!allowedCredKeys.has(key)) {
      continue
    }
    const trimmed = (value ?? "").trim()
    if (!trimmed) {
      continue
    }
    nextCredentials[key] = trimmed
    credentialsTouched = true
  }

  if (credentialsTouched && !canEncrypt()) {
    throw new Error(
      "Cannot store credentials: set PLATFORM_MONITOR_SECRET (or COOKIE_SECRET) on the backend"
    )
  }

  const nextSettings: Record<string, string> = {
    ...((existing?.settings as Record<string, string>) ?? {}),
  }
  for (const [key, value] of Object.entries(input.settings ?? {})) {
    if (!allowedSettingKeys.has(key)) {
      continue
    }
    const trimmed = (value ?? "").trim()
    if (trimmed) {
      nextSettings[key] = trimmed
    } else {
      // A setting is not a secret — blanking it is a legitimate way to fall
      // back to the env var, so unlike credentials, empty means delete.
      delete nextSettings[key]
    }
  }

  const payload = {
    provider: provider.id,
    label: input.label?.trim() || existing?.label || provider.label,
    settings: nextSettings,
    enabled: input.enabled ?? existing?.enabled ?? true,
    ...(Object.keys(nextCredentials).length
      ? { credentials_encrypted: encryptJson(nextCredentials) }
      : {}),
  }

  if (existing) {
    await svc.updatePlatformConnections({ id: existing.id, ...payload })
  } else {
    await svc.createPlatformConnections(payload)
  }

  const state = await listConnectionState(container)
  return state.find((s) => s.provider === provider.id)!
}

/** Explicitly wipe stored credentials, falling back to env vars if any exist. */
export async function clearCredentials(
  container: any,
  providerId: string
): Promise<void> {
  const rows = await loadRows(container)
  const existing = rows.get(providerId)
  if (!existing) {
    return
  }
  await service(container).updatePlatformConnections({
    id: existing.id,
    credentials_encrypted: null,
    last_status: "unconfigured",
    last_status_detail: null,
  })
}

/**
 * Run a provider's connectivity check and cache the result on the row.
 *
 * Caching is what lets the dashboard render without fanning out to eight
 * vendors on every page load. `persist: false` is used by the explicit
 * "Test all endpoints" screen, which wants live answers.
 */
export async function testConnection(
  container: any,
  providerId: string,
  options: { persist?: boolean } = {}
): Promise<HealthResult & { provider: string }> {
  const provider = getProvider(providerId)
  if (!provider) {
    throw new Error(`Unknown provider "${providerId}"`)
  }

  const rows = await loadRows(container)
  const row = rows.get(providerId)
  const ctx = contextFor(provider, row, container)
  const missing = missingFields(provider, ctx)

  let result: HealthResult
  if (missing.length) {
    result = { ok: false, detail: `Not configured — missing: ${missing.join(", ")}` }
  } else {
    try {
      result = await provider.test(ctx)
    } catch (e: any) {
      // An adapter throwing is a bug in the adapter, not a reason to 500 the
      // dashboard — report it in the same shape as a failed check.
      result = { ok: false, detail: `Check threw: ${e?.message ?? "unknown error"}` }
    }
  }

  if (options.persist !== false) {
    const status = missing.length ? "unconfigured" : result.ok ? "ok" : "error"
    const patch = {
      last_status: status,
      last_status_detail: result.detail.slice(0, 500),
      last_checked_at: new Date(),
    }

    if (row) {
      await service(container).updatePlatformConnections({ id: row.id, ...patch })
    } else if (!missing.length) {
      // Configured purely from env vars — materialise a row so the result is
      // remembered.
      await service(container).createPlatformConnections({
        provider: provider.id,
        label: provider.label,
        settings: {},
        enabled: true,
        ...patch,
      })
    }
  }

  return { ...result, provider: providerId }
}

export { describeProviders }
