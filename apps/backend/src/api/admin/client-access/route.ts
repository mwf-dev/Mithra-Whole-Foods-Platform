import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { SECTIONS, SECTION_KEYS, normalizeSections, type SectionKey } from "../../../lib/admin-access"
import {
  isEnforced,
  loadSections,
  resolveContext,
  saveSections,
  superEmails,
} from "../../../lib/admin-access-store"

/**
 * Super-admin only (enforced by the guard in src/api/middlewares.ts via
 * SUPER_ONLY_API; the explicit check below is a second lock).
 *
 * GET  /admin/client-access  → the switches, the people, and the setup status
 * POST /admin/client-access  → { sections: { orders: false, ... } }
 */
async function requireSuper(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as any).auth_context?.actor_id
  if (!actorId) {
    res.status(401).json({ message: "Not signed in" })
    return null
  }
  const ctx = await resolveContext(req.scope, actorId)
  if (ctx.enforced && !ctx.isSuper) {
    res.status(403).json({ type: "not_allowed", message: "This area is for the site administrator." })
    return null
  }
  return ctx
}

export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const ctx = await requireSuper(req, res)
  if (!ctx) return

  const supers = superEmails()
  const users = await req.scope
    .resolve(Modules.USER)
    .listUsers({}, { select: ["id", "email", "first_name", "last_name"], order: { email: "ASC" } })

  res.json({
    enforced: await isEnforced(req.scope),
    super_emails_configured: supers.length,
    you: { email: ctx.email, is_super: ctx.isSuper },
    sections: SECTIONS.map((s) => ({ key: s.key, label: s.label, description: s.description, group: s.group })),
    state: await loadSections(req.scope),
    users: users.map((u: any) => ({
      id: u.id,
      email: u.email,
      name: `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || null,
      role: supers.includes(String(u.email).toLowerCase()) ? "super" : "client",
    })),
  })
}

const Body = z.object({ sections: z.record(z.string(), z.boolean()) }).strict()

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<any> {
  const ctx = await requireSuper(req, res)
  if (!ctx) return

  const parsed = Body.safeParse(req.body ?? {})
  if (!parsed.success) return res.status(400).json({ message: "Send { sections: { <section>: true|false } }" })
  const unknown = Object.keys(parsed.data.sections).filter((k) => !SECTION_KEYS.includes(k as SectionKey))
  if (unknown.length) return res.status(400).json({ message: `Unknown section: ${unknown.join(", ")}` })

  const current = await loadSections(req.scope)
  const next = normalizeSections({ ...current, ...parsed.data.sections })
  await saveSections(req.scope, next, ctx.email)
  res.json({ state: next })
}
