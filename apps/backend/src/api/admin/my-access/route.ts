import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { hiddenNav } from "../../../lib/admin-access"
import { resolveContext } from "../../../lib/admin-access-store"

/**
 * GET /admin/my-access — what the signed-in admin may see. The injected nav
 * script calls this on every admin page load to hide menu items; the server
 * guard is what actually enforces it.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const actorId = (req as any).auth_context?.actor_id
  if (!actorId) return res.status(401).json({ message: "Not signed in" })
  const ctx = await resolveContext(req.scope, actorId)
  res.json({
    enforced: ctx.enforced,
    is_super: ctx.isSuper,
    email: ctx.email,
    hidden_nav: hiddenNav(ctx),
  })
}
