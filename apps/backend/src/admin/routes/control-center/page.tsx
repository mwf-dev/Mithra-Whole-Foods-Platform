import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ShieldCheck } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Switch, Text, toast, usePrompt } from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"

type Section = { key: string; label: string; description: string; group: string }
type Person = { id: string; email: string; name: string | null; role: "super" | "client" }
type Access = {
  enforced: boolean
  super_emails_configured: number
  you: { email: string | null; is_super: boolean }
  sections: Section[]
  state: Record<string, boolean>
  users: Person[]
}
type Check = { id: string; group: string; label: string; status: "pass" | "warn" | "fail" | "skip"; detail: string; remedy?: string }
type Health = { status: "pass" | "warn" | "fail"; counts: Record<string, number>; checks: Check[]; checked_at: string }
type Usage = { process?: { uptime_human?: string }; traffic?: { requests_last_hour?: number } }

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body?.message || `Request failed (${res.status})`)
  return body
}

const STATUS_COLOR = { pass: "green", warn: "orange", fail: "red", skip: "grey" } as const

const ControlCenterPage = () => {
  const prompt = usePrompt()
  const [access, setAccess] = useState<Access | null>(null)
  const [health, setHealth] = useState<Health | null>(null)
  const [usage, setUsage] = useState<Usage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setAccess(await api("/admin/client-access"))
      setError(null)
    } catch (e: any) {
      setError(e.message)
      return
    }
    // Monitoring is best-effort: a slow vendor check must not block the switches.
    api("/admin/platform/health?scope=config").then(setHealth).catch(() => {})
    api("/admin/usage").then(setUsage).catch(() => {})
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const groups = useMemo(() => {
    const g = new Map<string, Section[]>()
    for (const s of access?.sections ?? []) g.set(s.group, [...(g.get(s.group) ?? []), s])
    return [...g.entries()]
  }, [access])

  const toggle = async (s: Section, on: boolean) => {
    const ok = await prompt({
      title: on ? `Show "${s.label}" to the client?` : `Hide "${s.label}" from the client?`,
      description: on
        ? "It appears in their menu again straight away."
        : "It disappears from their menu, and the system refuses their requests to it. You still see it.",
      confirmText: on ? "Yes, show it" : "Yes, hide it",
      cancelText: "Cancel",
    })
    if (!ok) return
    setBusy(s.key)
    try {
      const r = await api("/admin/client-access", { method: "POST", body: JSON.stringify({ sections: { [s.key]: on } }) })
      setAccess((a) => (a ? { ...a, state: r.state } : a))
      toast.success(on ? `${s.label} is now visible to the client` : `${s.label} is now hidden from the client`)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusy(null)
    }
  }

  if (error) {
    return (
      <Container>
        <Heading level="h1">Control center</Heading>
        <Text className="mt-2 text-ui-fg-error">{error}</Text>
        <Text size="small" className="mt-1 text-ui-fg-subtle">This page is only for the site administrator.</Text>
      </Container>
    )
  }

  const problems = (health?.checks ?? []).filter((c) => c.status === "fail" || c.status === "warn")

  return (
    <div className="flex flex-col gap-4">
      <Container className="p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <div className="flex items-center gap-2">
              <Heading level="h1">Control center</Heading>
              <Badge size="2xsmall" color="purple">Site administrator</Badge>
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              Decide what the client sees, and watch the health of the whole application.
            </Text>
          </div>
          <div className="flex gap-2">
            <a href="/app/platform"><Button size="small" variant="secondary">Infrastructure &amp; costs</Button></a>
            <Button size="small" variant="secondary" onClick={load}>Refresh</Button>
          </div>
        </div>

        {access && !access.enforced && (
          <div className="border-t border-ui-border-base bg-ui-bg-subtle px-6 py-4">
            <Text weight="plus">Setup isn't finished — the client can still see everything.</Text>
            <ol className="mt-1 list-decimal pl-5 text-sm text-ui-fg-subtle">
              <li>Create your own login (see the setup note in <code>docs/SUPER_ADMIN.md</code>).</li>
              <li>Set <code>SUPER_ADMIN_EMAILS</code> on Railway to that email, then redeploy.</li>
              <li>Come back here — this notice disappears and the switches below start protecting the client's view.</li>
            </ol>
            <Text size="xsmall" className="mt-2 text-ui-fg-muted">
              {access.super_emails_configured
                ? "SUPER_ADMIN_EMAILS is set, but no account with that email exists yet."
                : "SUPER_ADMIN_EMAILS is not set."}
            </Text>
          </div>
        )}
      </Container>

      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h2">System health</Heading>
          {!health ? (
            <Text size="small" className="text-ui-fg-subtle">Checking…</Text>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge color={STATUS_COLOR[health.status]}>
                  {health.status === "pass" ? "All good" : health.status === "warn" ? "Needs attention" : "Something is broken"}
                </Badge>
                <Text size="small" className="text-ui-fg-subtle">
                  {health.counts.pass} ok · {health.counts.warn} warnings · {health.counts.fail} failing
                </Text>
                {usage?.process?.uptime_human && (
                  <Text size="small" className="text-ui-fg-subtle">· backend up {usage.process.uptime_human}</Text>
                )}
                {usage?.traffic?.requests_last_hour !== undefined && (
                  <Text size="small" className="text-ui-fg-subtle">· {usage.traffic.requests_last_hour} requests in the last hour</Text>
                )}
              </div>
              {problems.length > 0 && (
                <ul className="mt-3 flex flex-col gap-2">
                  {problems.map((c) => (
                    <li key={c.id} className="rounded-lg border border-ui-border-base p-3">
                      <div className="flex items-center gap-2">
                        <Badge size="2xsmall" color={STATUS_COLOR[c.status]}>{c.status === "fail" ? "Failing" : "Warning"}</Badge>
                        <Text size="small" weight="plus">{c.label}</Text>
                      </div>
                      <Text size="small" className="text-ui-fg-subtle">{c.detail}</Text>
                      {c.remedy && <Text size="xsmall" className="text-ui-fg-muted">Fix: {c.remedy}</Text>}
                    </li>
                  ))}
                </ul>
              )}
              <Text size="xsmall" className="mt-3 text-ui-fg-muted">
                Settings checks only. Open <a className="underline" href="/app/platform">Infrastructure</a> for live checks of Vercel, Railway, Neon, Stripe and the rest.
              </Text>
            </>
          )}
        </div>
      </Container>

      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h2">What the client sees</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Switch a section off and it disappears from the client's menu; the system also refuses their requests to it.
            Infrastructure, this page, users and API keys are always hidden from the client.
          </Text>
        </div>
        {!access && <Text className="px-6 pb-4 text-ui-fg-subtle">Loading…</Text>}
        {groups.map(([group, items]) => (
          <div key={group} className="border-t border-ui-border-base">
            <Text size="xsmall" weight="plus" className="bg-ui-bg-subtle px-6 py-2 uppercase tracking-wide text-ui-fg-subtle">{group}</Text>
            <ul>
              {items.map((s) => (
                <li key={s.key} className="flex items-center justify-between gap-4 border-t border-ui-border-base px-6 py-3 first:border-t-0">
                  <div>
                    <Text weight="plus">{s.label}</Text>
                    <Text size="small" className="text-ui-fg-subtle">{s.description}</Text>
                  </div>
                  <Switch
                    checked={access!.state[s.key] !== false}
                    disabled={busy === s.key}
                    onCheckedChange={(on) => toggle(s, on)}
                    aria-label={`Show ${s.label} to the client`}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>

      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h2">Who can sign in</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Super admins are the emails in <code>SUPER_ADMIN_EMAILS</code>; everyone else is a client login.
          </Text>
        </div>
        <ul>
          {(access?.users ?? []).map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 border-t border-ui-border-base px-6 py-3">
              <div>
                <Text weight="plus">{u.email}{access?.you.email === u.email.toLowerCase() ? " (you)" : ""}</Text>
                {u.name && <Text size="small" className="text-ui-fg-subtle">{u.name}</Text>}
              </div>
              <Badge color={u.role === "super" ? "purple" : "blue"}>{u.role === "super" ? "Super admin" : "Client"}</Badge>
            </li>
          ))}
        </ul>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Control center",
  icon: ShieldCheck,
})

export default ControlCenterPage
