import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { decide, defaultSections } from "../lib/admin-access"
import { resolveContext } from "../lib/admin-access-store"
import { reportError } from "../lib/observability"

/**
 * Applies the super-admin / client rules (src/lib/admin-access.ts) to every
 * `/admin/*` request made by a signed-in admin user.
 *
 * Anonymous requests pass straight through, so Medusa's own login, password
 * reset and invite-accept flows are untouched — Medusa's auth middleware still
 * rejects them if they need a session.
 *
 * If the lookup itself fails, the technical areas and user management stay
 * locked (treated as a client with every section on) rather than opening up.
 */
export async function adminAccessGuard(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  const auth = (req as any).auth_context
  if (!auth || auth.actor_type !== "user" || !auth.actor_id) return next()

  const path = (req.originalUrl || req.url || "").split("?")[0]
  let ctx
  try {
    ctx = await resolveContext(req.scope, auth.actor_id)
  } catch (e) {
    reportError(e, { scope: "admin-access-guard", level: "warning" })
    ctx = { enforced: true, isSuper: false, actorId: auth.actor_id, sections: defaultSections(), email: null }
  }

  const verdict = decide(req.method, path, ctx)
  if (verdict.allow) return next()

  return res.status(403).json({ type: "not_allowed", message: verdict.reason })
}
