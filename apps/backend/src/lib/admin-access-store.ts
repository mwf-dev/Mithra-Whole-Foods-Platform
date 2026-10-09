import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  normalizeSections,
  parseSuperEmails,
  type AccessContext,
  type SectionState,
} from "./admin-access"

/**
 * Persistence + identity for the admin access rules.
 *
 * The client's section switches live in the store's own `metadata`
 * (`client_access`), so no migration or new table is needed and they survive
 * redeploys. Lookups are cached for a short time because the guard runs on
 * every admin request; saving through this module drops the cache at once.
 */
const SETTINGS_TTL = 15_000
const IDENTITY_TTL = 60_000

let settingsCache: { at: number; sections: SectionState } | null = null
const emailCache = new Map<string, { at: number; email: string | null }>()
let enforcedCache: { at: number; key: string; value: boolean } | null = null

export const clearAccessCache = () => {
  settingsCache = null
  emailCache.clear()
  enforcedCache = null
}

export const superEmails = () => parseSuperEmails(process.env.SUPER_ADMIN_EMAILS)

async function firstStore(container: MedusaContainer): Promise<any | null> {
  const [store] = await container.resolve(Modules.STORE).listStores({}, { take: 1 })
  return store ?? null
}

export async function loadSections(container: MedusaContainer): Promise<SectionState> {
  if (settingsCache && Date.now() - settingsCache.at < SETTINGS_TTL) return settingsCache.sections
  const store = await firstStore(container)
  const sections = normalizeSections((store?.metadata as any)?.client_access?.sections)
  settingsCache = { at: Date.now(), sections }
  return sections
}

export async function saveSections(
  container: MedusaContainer,
  sections: SectionState,
  byEmail: string | null
): Promise<SectionState> {
  const store = await firstStore(container)
  if (!store) throw new Error("No store found to save settings on.")
  await container.resolve(Modules.STORE).updateStores(store.id, {
    metadata: {
      ...(store.metadata ?? {}),
      client_access: { sections, updated_at: new Date().toISOString(), updated_by: byEmail },
    },
  })
  clearAccessCache()
  return sections
}

export async function emailOf(container: MedusaContainer, actorId: string): Promise<string | null> {
  const hit = emailCache.get(actorId)
  if (hit && Date.now() - hit.at < IDENTITY_TTL) return hit.email
  let email: string | null = null
  try {
    const user = await container.resolve(Modules.USER).retrieveUser(actorId, { select: ["id", "email"] })
    email = user?.email ? user.email.toLowerCase() : null
  } catch {
    email = null
  }
  emailCache.set(actorId, { at: Date.now(), email })
  return email
}

/**
 * Enforcement only switches on once a listed super-admin email belongs to a real
 * user. A typo in SUPER_ADMIN_EMAILS (or setting it before the account exists)
 * therefore can't lock everyone out of the technical pages — it just leaves the
 * admin behaving exactly as it did before.
 */
export async function isEnforced(container: MedusaContainer): Promise<boolean> {
  const emails = superEmails()
  if (!emails.length) return false
  const key = emails.join(",")
  if (enforcedCache && enforcedCache.key === key && Date.now() - enforcedCache.at < IDENTITY_TTL) {
    return enforcedCache.value
  }
  const users = await container.resolve(Modules.USER).listUsers({ email: emails }, { select: ["id", "email"] })
  const value = users.length > 0
  enforcedCache = { at: Date.now(), key, value }
  return value
}

export async function resolveContext(container: MedusaContainer, actorId: string): Promise<AccessContext & { email: string | null }> {
  const [enforced, email, sections] = await Promise.all([
    isEnforced(container),
    emailOf(container, actorId),
    loadSections(container),
  ])
  return {
    enforced,
    email,
    isSuper: !!email && superEmails().includes(email),
    actorId,
    sections,
  }
}
