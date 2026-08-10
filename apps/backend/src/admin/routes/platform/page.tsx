import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ServerStack } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  Table,
  Tabs,
  toast,
  StatusBadge,
  Drawer,
} from "@medusajs/ui"
import { ArrowPath, CheckCircleSolid, ExclamationCircleSolid, XCircleSolid } from "@medusajs/icons"
import { useCallback, useEffect, useMemo, useState } from "react"

/**
 * Internal infrastructure dashboard — Vercel, Railway, Neon, Cloudinary,
 * Stripe, SendGrid, plus this backend and the storefront, all in one screen.
 *
 * Reads/writes `/admin/platform*` (see `src/lib/platform-monitor/` and
 * `src/api/admin/platform/`). Nothing here talks to a vendor directly — every
 * credential and every vendor call stays server-side; this page only ever sees
 * masked previews.
 */

// ---------------------------------------------------------------------------
// Types (mirror the API — see src/lib/platform-monitor/types.ts)
// ---------------------------------------------------------------------------

type Category = "hosting" | "database" | "media" | "payments" | "email" | "internal"

type FieldSpec = {
  key: string
  label: string
  type: "password" | "text"
  required: boolean
  placeholder?: string
  help?: string
  env?: string
}

type ProviderMeta = {
  id: string
  label: string
  category: Category
  docs_url: string
  setup_hint: string
  builtin: boolean
  credential_fields: FieldSpec[]
  setting_fields: FieldSpec[]
}

type ConnectionState = {
  provider: string
  label: string
  category: Category
  builtin: boolean
  docs_url: string
  setup_hint: string
  id: string | null
  enabled: boolean
  configured: boolean
  missing_fields: string[]
  credential_preview: Record<string, string | null>
  field_sources: Record<string, "stored" | "env">
  settings: Record<string, string>
  last_status: string
  last_status_detail: string | null
  last_checked_at: string | null
  last_collected_at: string | null
}

type Projection = {
  metric_key: string
  label: string
  unit: string
  current: number | null
  limit: number | null
  projected: number | null
  current_pct: number | null
  projected_pct: number | null
  projection_note: string | null
  status: "ok" | "warning" | "critical" | "unknown"
}

type ProviderOverview = {
  provider: string
  label: string
  category: Category
  builtin: boolean
  enabled: boolean
  status: string
  error: string | null
  last_status: string
  last_status_detail: string | null
  captured_at: string | null
  cycle_start: string | null
  cycle_end: string | null
  cycle_elapsed_pct: number
  cost_estimate_usd: number | null
  metrics: Projection[]
  worst_status: "ok" | "warning" | "critical" | "unknown"
}

type Alert = {
  id: string
  provider: string
  metric_key: string
  severity: "warning" | "critical"
  message: string
  triggered_at: string
  last_seen_at: string
  resolved_at: string | null
  acknowledged_at: string | null
}

type Overview = {
  generated_at: string
  estimated_cycle_cost_usd: number
  overall_status: "ok" | "warning" | "critical" | "unknown"
  providers: ProviderOverview[]
  alerts: Alert[]
}

type PlatformResponse = {
  providers: ProviderMeta[]
  connections: ConnectionState[]
  overview: Overview
  capabilities: {
    can_store_credentials: boolean
    slack_configured: boolean
    email_configured: boolean
  }
}

type Check = {
  id: string
  group: "platform" | "configuration" | "commerce"
  label: string
  status: "pass" | "warn" | "fail" | "skip"
  detail: string
  remedy?: string
  latency_ms?: number
}

type HealthResponse = {
  checked_at: string
  status: "pass" | "warn" | "fail"
  counts: { pass: number; warn: number; fail: number; skip: number }
  checks: Check[]
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

const UNIT_LABEL: Record<string, string> = {
  gb: "GB",
  gb_hours: "GB·h",
  hours: "h",
  count: "",
  usd: "$",
  percent: "%",
  ms: "ms",
  credits: "cr",
}

function fmtValue(value: number | null, unit: string): string {
  if (value === null) return "—"
  const rounded = Number.isInteger(value) ? value : Math.round(value * 100) / 100
  if (unit === "usd") return `$${rounded.toLocaleString()}`
  const suffix = UNIT_LABEL[unit] ?? ""
  return suffix ? `${rounded.toLocaleString()} ${suffix}` : rounded.toLocaleString()
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "never"
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.round(ms / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 48) return `${hrs}h ago`
  return `${Math.round(hrs / 24)}d ago`
}

const STATUS_COLOR: Record<string, "green" | "orange" | "red" | "grey"> = {
  ok: "green",
  pass: "green",
  warning: "orange",
  warn: "orange",
  critical: "red",
  fail: "red",
  unknown: "grey",
  skip: "grey",
  unconfigured: "grey",
  never: "grey",
  error: "red",
}

function StatusDot({ status }: { status: string }) {
  const color = STATUS_COLOR[status] ?? "grey"
  const Icon =
    color === "green" ? CheckCircleSolid : color === "red" ? XCircleSolid : ExclamationCircleSolid
  return <Icon className={`text-ui-tag-${color}-icon`} />
}

// ---------------------------------------------------------------------------
// Data hook
// ---------------------------------------------------------------------------

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/admin/platform${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.message || `Request failed (${res.status})`)
  }
  return res.json()
}

function usePlatform() {
  const [data, setData] = useState<PlatformResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const result = await api<PlatformResponse>("")
      setData(result)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  return { data, loading, error, reload }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

const PlatformDashboard = () => {
  const { data, loading, error, reload } = usePlatform()
  const [tab, setTab] = useState("overview")
  const [refreshing, setRefreshing] = useState(false)
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [healthLoading, setHealthLoading] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [alerts, setAlerts] = useState<Alert[] | null>(null)

  const refreshUsage = async () => {
    setRefreshing(true)
    try {
      const outcome = await api<{ results: { provider: string; status: string }[] }>(
        "/collect",
        { method: "POST", body: JSON.stringify({}) }
      )
      const failed = outcome.results.filter((r) => r.status === "error")
      toast[failed.length ? "warning" : "success"](
        failed.length
          ? `Refreshed — ${failed.length} provider(s) failed`
          : "Usage refreshed"
      )
      await reload()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setRefreshing(false)
    }
  }

  const runHealthCheck = async () => {
    setHealthLoading(true)
    try {
      const result = await api<HealthResponse>("/health")
      setHealth(result)
      setTab("health")
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setHealthLoading(false)
    }
  }

  const loadAlerts = useCallback(async () => {
    const result = await api<{ alerts: Alert[] }>("/alerts?status=all")
    setAlerts(result.alerts)
  }, [])

  useEffect(() => {
    if (tab === "alerts") {
      loadAlerts()
    }
  }, [tab, loadAlerts])

  if (loading && !data) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-subtle">Loading infrastructure status…</Text>
      </Container>
    )
  }

  if (error && !data) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-error">{error}</Text>
      </Container>
    )
  }

  const openAlertCount = data!.overview.alerts.length

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <Heading level="h1">Infrastructure</Heading>
            <Text className="text-ui-fg-subtle" size="small">
              Vercel, Railway, Neon, Cloudinary, Stripe, SendGrid — one place to
              watch usage, cost run-rate, and configuration gaps.
            </Text>
          </div>
          {data!.overview.overall_status !== "ok" && (
            <StatusBadge color={STATUS_COLOR[data!.overview.overall_status]}>
              {data!.overview.overall_status}
            </StatusBadge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="small"
            variant="secondary"
            isLoading={healthLoading}
            onClick={runHealthCheck}
          >
            Verify every endpoint
          </Button>
          <Button size="small" isLoading={refreshing} onClick={refreshUsage}>
            <ArrowPath className="mr-1" />
            Refresh usage
          </Button>
        </div>
      </div>

      <div className="px-6 py-3">
        <Tabs value={tab} onValueChange={setTab}>
          <Tabs.List>
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="connections">Connections</Tabs.Trigger>
            <Tabs.Trigger value="alerts">
              Alerts {openAlertCount ? `(${openAlertCount})` : ""}
            </Tabs.Trigger>
            <Tabs.Trigger value="health">Verification</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="overview" className="pt-4">
            <OverviewTab overview={data!.overview} />
          </Tabs.Content>

          <Tabs.Content value="connections" className="pt-4">
            <ConnectionsTab
              providers={data!.providers}
              connections={data!.connections}
              canStore={data!.capabilities.can_store_credentials}
              editing={editing}
              setEditing={setEditing}
              onSaved={reload}
            />
          </Tabs.Content>

          <Tabs.Content value="alerts" className="pt-4">
            <AlertsTab
              alerts={alerts ?? data!.overview.alerts}
              onChanged={async () => {
                await loadAlerts()
                await reload()
              }}
            />
          </Tabs.Content>

          <Tabs.Content value="health" className="pt-4">
            <HealthTab
              health={health}
              loading={healthLoading}
              onRun={runHealthCheck}
            />
          </Tabs.Content>
        </Tabs>
      </div>
    </Container>
  )
}

// ---------------------------------------------------------------------------
// Overview tab
// ---------------------------------------------------------------------------

function OverviewTab({ overview }: { overview: Overview }) {
  const grouped = useMemo(() => {
    const g: Record<Category, ProviderOverview[]> = {
      internal: [],
      hosting: [],
      database: [],
      media: [],
      payments: [],
      email: [],
    }
    for (const p of overview.providers) {
      g[p.category].push(p)
    }
    return g
  }, [overview])

  const categoryLabel: Record<Category, string> = {
    internal: "This app",
    hosting: "Hosting",
    database: "Database",
    media: "Media",
    payments: "Payments",
    email: "Email",
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-4">
        <StatTile
          label="Overall status"
          value={overview.overall_status}
          isStatus
        />
        <StatTile
          label="Open alerts"
          value={String(overview.alerts.length)}
          tone={overview.alerts.length ? "warning" : "ok"}
        />
        <StatTile
          label="Estimated cost this cycle"
          value={`$${overview.estimated_cycle_cost_usd.toLocaleString()}`}
        />
      </div>

      {(Object.keys(grouped) as Category[])
        .filter((c) => grouped[c].length)
        .map((category) => (
          <div key={category} className="flex flex-col gap-2">
            <Text weight="plus" size="small" className="text-ui-fg-subtle">
              {categoryLabel[category]}
            </Text>
            <div className="grid grid-cols-2 gap-3">
              {grouped[category].map((p) => (
                <ProviderCard key={p.provider} provider={p} />
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}

function StatTile({
  label,
  value,
  isStatus,
  tone,
}: {
  label: string
  value: string
  isStatus?: boolean
  tone?: "ok" | "warning"
}) {
  return (
    <div className="rounded-lg border p-4">
      <Text size="small" className="text-ui-fg-subtle">
        {label}
      </Text>
      <div className="mt-1 flex items-center gap-2">
        {isStatus && <StatusDot status={value} />}
        <Text
          size="xlarge"
          weight="plus"
          className={tone === "warning" && value !== "0" ? "text-ui-tag-orange-text" : ""}
        >
          {value}
        </Text>
      </div>
    </div>
  )
}

function ProviderCard({ provider }: { provider: ProviderOverview }) {
  const notConfigured = provider.last_status === "unconfigured"

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusDot status={notConfigured ? "unconfigured" : provider.worst_status} />
          <Text weight="plus">{provider.label}</Text>
        </div>
        <Text size="xsmall" className="text-ui-fg-muted">
          {fmtRelative(provider.captured_at)}
        </Text>
      </div>

      {notConfigured ? (
        <Text size="small" className="text-ui-fg-subtle mt-2">
          Not configured yet — add credentials under Connections.
        </Text>
      ) : provider.status === "error" ? (
        <Text size="small" className="text-ui-fg-error mt-2">
          Collection failing: {provider.error}
        </Text>
      ) : (
        <div className="mt-2 flex flex-col gap-1.5">
          {provider.metrics.slice(0, 4).map((m) => (
            <MetricRow key={m.metric_key} metric={m} />
          ))}
          {provider.metrics.length === 0 && (
            <Text size="small" className="text-ui-fg-subtle">
              No metrics reported yet.
            </Text>
          )}
        </div>
      )}
    </div>
  )
}

function MetricRow({ metric }: { metric: Projection }) {
  const pct = metric.projected_pct ?? metric.current_pct
  return (
    <div className="flex items-center justify-between gap-2">
      <Text size="small" className="text-ui-fg-subtle">
        {metric.label}
      </Text>
      <div className="flex items-center gap-2">
        <Text size="small">
          {fmtValue(metric.current, metric.unit)}
          {metric.limit ? ` / ${fmtValue(metric.limit, metric.unit)}` : ""}
        </Text>
        {metric.status !== "unknown" && (
          <Badge size="2xsmall" color={STATUS_COLOR[metric.status]}>
            {pct !== null ? `${pct}%` : metric.status}
          </Badge>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Connections tab
// ---------------------------------------------------------------------------

function ConnectionsTab({
  providers,
  connections,
  canStore,
  editing,
  setEditing,
  onSaved,
}: {
  providers: ProviderMeta[]
  connections: ConnectionState[]
  canStore: boolean
  editing: string | null
  setEditing: (id: string | null) => void
  onSaved: () => Promise<void>
}) {
  const byId = new Map(connections.map((c) => [c.provider, c]))

  return (
    <div className="flex flex-col gap-3">
      {!canStore && (
        <div className="rounded-lg border border-ui-tag-orange-border bg-ui-tag-orange-bg p-3">
          <Text size="small" className="text-ui-tag-orange-text">
            No encryption secret is set on the backend (PLATFORM_MONITOR_SECRET
            or COOKIE_SECRET), so credentials can't be saved here yet. Set env
            vars per-provider directly on the backend instead, or add that
            secret and redeploy.
          </Text>
        </div>
      )}

      <Table>
        <Table.Header>
          <Table.Row>
            <Table.HeaderCell>Platform</Table.HeaderCell>
            <Table.HeaderCell>Status</Table.HeaderCell>
            <Table.HeaderCell>Configured via</Table.HeaderCell>
            <Table.HeaderCell>Last checked</Table.HeaderCell>
            <Table.HeaderCell />
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {providers.map((meta) => {
            const conn = byId.get(meta.id)
            const source = conn
              ? Object.values(conn.field_sources)[0] ?? null
              : null
            return (
              <Table.Row key={meta.id}>
                <Table.Cell>
                  <div className="flex flex-col">
                    <Text weight="plus" size="small">
                      {meta.label}
                    </Text>
                    {meta.builtin && (
                      <Text size="xsmall" className="text-ui-fg-muted">
                        built-in
                      </Text>
                    )}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-2">
                    <StatusDot status={conn?.last_status ?? "unconfigured"} />
                    <Text size="small">{conn?.last_status ?? "unconfigured"}</Text>
                  </div>
                  {conn?.last_status_detail && (
                    <Text size="xsmall" className="text-ui-fg-subtle max-w-sm">
                      {conn.last_status_detail}
                    </Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle">
                    {conn?.configured
                      ? source === "env"
                        ? "environment variable"
                        : "stored in admin"
                      : "not configured"}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle">
                    {fmtRelative(conn?.last_checked_at ?? null)}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Button
                    size="small"
                    variant="secondary"
                    onClick={() => setEditing(meta.id)}
                  >
                    {meta.builtin ? "View" : "Configure"}
                  </Button>
                </Table.Cell>
              </Table.Row>
            )
          })}
        </Table.Body>
      </Table>

      {editing && (
        <ConnectionDrawer
          meta={providers.find((p) => p.id === editing)!}
          connection={byId.get(editing)}
          canStore={canStore}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      )}
    </div>
  )
}

function ConnectionDrawer({
  meta,
  connection,
  canStore,
  onClose,
  onSaved,
}: {
  meta: ProviderMeta
  connection: ConnectionState | undefined
  canStore: boolean
  onClose: () => void
  onSaved: () => Promise<void>
}) {
  const [credentials, setCredentials] = useState<Record<string, string>>({})
  const [settings, setSettings] = useState<Record<string, string>>(
    connection?.settings ?? {}
  )
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(
    null
  )

  const save = async () => {
    setSaving(true)
    try {
      await api(`/connections`, {
        method: "POST",
        body: JSON.stringify({ provider: meta.id, credentials, settings }),
      })
      toast.success(`${meta.label} saved`)
      await onSaved()
      setCredentials({})
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const test = async () => {
    setTesting(true)
    setTestResult(null)
    try {
      // Save first so the test exercises what was just typed.
      if (Object.keys(credentials).length || Object.keys(settings).length) {
        await api(`/connections`, {
          method: "POST",
          body: JSON.stringify({ provider: meta.id, credentials, settings }),
        })
      }
      const result = await api<{ ok: boolean; detail: string }>(
        `/connections/${meta.id}/test`,
        { method: "POST" }
      )
      setTestResult(result)
      await onSaved()
    } catch (e: any) {
      setTestResult({ ok: false, detail: e.message })
    } finally {
      setTesting(false)
    }
  }

  return (
    <Drawer open onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{meta.label}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          <Text size="small" className="text-ui-fg-subtle">
            {meta.setup_hint}
          </Text>
          {meta.docs_url && (
            <a
              href={meta.docs_url}
              target="_blank"
              rel="noreferrer"
              className="text-ui-fg-interactive text-sm"
            >
              API documentation ↗
            </a>
          )}

          {meta.credential_fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <Label size="small">{field.label}</Label>
              <Input
                type={field.type === "password" ? "password" : "text"}
                placeholder={
                  connection?.credential_preview?.[field.key] ??
                  field.placeholder ??
                  ""
                }
                disabled={!canStore}
                value={credentials[field.key] ?? ""}
                onChange={(e) =>
                  setCredentials((c) => ({ ...c, [field.key]: e.target.value }))
                }
              />
              {connection?.credential_preview?.[field.key] && (
                <Text size="xsmall" className="text-ui-fg-muted">
                  Currently: {connection.credential_preview[field.key]} (
                  {connection.field_sources[field.key] === "env"
                    ? "from environment"
                    : "stored"}
                  )
                </Text>
              )}
            </div>
          ))}

          {meta.setting_fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1">
              <Label size="small">{field.label}</Label>
              <Input
                type="text"
                placeholder={field.placeholder ?? ""}
                value={settings[field.key] ?? ""}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, [field.key]: e.target.value }))
                }
              />
            </div>
          ))}

          {meta.credential_fields.length === 0 && meta.setting_fields.length === 0 && (
            <Text size="small" className="text-ui-fg-subtle">
              No configuration needed — this measures the running application
              directly.
            </Text>
          )}

          {testResult && (
            <div
              className={`rounded-lg border p-3 ${
                testResult.ok
                  ? "border-ui-tag-green-border bg-ui-tag-green-bg"
                  : "border-ui-tag-red-border bg-ui-tag-red-bg"
              }`}
            >
              <Text
                size="small"
                className={
                  testResult.ok ? "text-ui-tag-green-text" : "text-ui-tag-red-text"
                }
              >
                {testResult.detail}
              </Text>
            </div>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button variant="secondary" isLoading={testing} onClick={test}>
            Test connection
          </Button>
          {!meta.builtin && (
            <Button isLoading={saving} disabled={!canStore} onClick={save}>
              Save
            </Button>
          )}
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

// ---------------------------------------------------------------------------
// Alerts tab
// ---------------------------------------------------------------------------

function AlertsTab({
  alerts,
  onChanged,
}: {
  alerts: Alert[]
  onChanged: () => Promise<void>
}) {
  const [busyId, setBusyId] = useState<string | null>(null)

  const act = async (id: string, action: "acknowledge" | "resolve") => {
    setBusyId(id)
    try {
      await api(`/alerts/${id}`, { method: "POST", body: JSON.stringify({ action }) })
      await onChanged()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setBusyId(null)
    }
  }

  if (!alerts.length) {
    return (
      <Text className="text-ui-fg-subtle">Nothing raised — every metric is under budget.</Text>
    )
  }

  return (
    <Table>
      <Table.Header>
        <Table.Row>
          <Table.HeaderCell>Severity</Table.HeaderCell>
          <Table.HeaderCell>Message</Table.HeaderCell>
          <Table.HeaderCell>Since</Table.HeaderCell>
          <Table.HeaderCell>Status</Table.HeaderCell>
          <Table.HeaderCell />
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {alerts.map((a) => (
          <Table.Row key={a.id}>
            <Table.Cell>
              <Badge color={STATUS_COLOR[a.severity]} size="2xsmall">
                {a.severity}
              </Badge>
            </Table.Cell>
            <Table.Cell className="max-w-lg">
              <Text size="small">{a.message}</Text>
            </Table.Cell>
            <Table.Cell>
              <Text size="small" className="text-ui-fg-subtle">
                {fmtRelative(a.triggered_at)}
              </Text>
            </Table.Cell>
            <Table.Cell>
              <Text size="small" className="text-ui-fg-subtle">
                {a.resolved_at ? "resolved" : a.acknowledged_at ? "acknowledged" : "open"}
              </Text>
            </Table.Cell>
            <Table.Cell>
              {!a.resolved_at && (
                <div className="flex justify-end gap-2">
                  {!a.acknowledged_at && (
                    <Button
                      size="small"
                      variant="secondary"
                      disabled={busyId === a.id}
                      onClick={() => act(a.id, "acknowledge")}
                    >
                      Acknowledge
                    </Button>
                  )}
                  <Button
                    size="small"
                    variant="secondary"
                    disabled={busyId === a.id}
                    onClick={() => act(a.id, "resolve")}
                  >
                    Resolve
                  </Button>
                </div>
              )}
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table>
  )
}

// ---------------------------------------------------------------------------
// Health / verification tab
// ---------------------------------------------------------------------------

function HealthTab({
  health,
  loading,
  onRun,
}: {
  health: HealthResponse | null
  loading: boolean
  onRun: () => Promise<void>
}) {
  if (!health) {
    return (
      <div className="flex flex-col items-start gap-3">
        <Text className="text-ui-fg-subtle">
          Runs a live check against every platform, plus the configuration flags
          and store readiness checks (regions, shipping options, payment
          providers, publishable keys) that decide whether checkout actually
          works.
        </Text>
        <Button isLoading={loading} onClick={onRun}>
          Run verification
        </Button>
      </div>
    )
  }

  const groups: { key: Check["group"]; label: string }[] = [
    { key: "platform", label: "Platform connectivity" },
    { key: "configuration", label: "Configuration" },
    { key: "commerce", label: "Store readiness" },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <StatusDot status={health.status} />
          <Text weight="plus">
            {health.counts.pass} passed · {health.counts.warn} warnings ·{" "}
            {health.counts.fail} failed · {health.counts.skip} skipped
          </Text>
        </div>
        <Button size="small" variant="secondary" isLoading={loading} onClick={onRun}>
          Re-run
        </Button>
      </div>

      {groups.map((g) => {
        const items = health.checks.filter((c) => c.group === g.key)
        if (!items.length) return null
        return (
          <div key={g.key} className="flex flex-col gap-2">
            <Text weight="plus" size="small" className="text-ui-fg-subtle">
              {g.label}
            </Text>
            <Table>
              <Table.Body>
                {items.map((c) => (
                  <Table.Row key={c.id}>
                    <Table.Cell className="w-8">
                      <StatusDot status={c.status} />
                    </Table.Cell>
                    <Table.Cell className="w-56">
                      <Text size="small" weight="plus">
                        {c.label}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="text-ui-fg-subtle">
                        {c.detail}
                      </Text>
                      {c.remedy && c.status !== "pass" && (
                        <Text size="xsmall" className="text-ui-fg-muted mt-0.5">
                          Fix: {c.remedy}
                        </Text>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </div>
        )
      })}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Infrastructure",
  icon: ServerStack,
})

export default PlatformDashboard
