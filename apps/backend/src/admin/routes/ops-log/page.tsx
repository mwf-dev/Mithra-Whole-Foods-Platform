import { defineRouteConfig } from "@medusajs/admin-sdk"
import { DocumentText } from "@medusajs/icons"
import { Badge, Button, Container, Heading, Text, toast } from "@medusajs/ui"
import { useCallback, useEffect, useState } from "react"

type Row = {
  id: string
  kind: "email" | "webhook" | "label"
  source: string
  status: "ok" | "failed"
  order_id: string | null
  email: string | null
  reference: string | null
  detail: string | null
  retried_at: string | null
  created_at: string
}

const KIND_LABEL: Record<Row["kind"], string> = {
  email: "Email",
  webhook: "Webhook",
  label: "Label",
}

const ago = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 60) return m < 1 ? "just now" : `${m}m ago`
  const h = Math.floor(m / 60)
  return h < 24 ? `${h}h ago` : `${Math.floor(h / 24)}d ago`
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((body as any)?.message || `Request failed (${res.status})`)
  return body as T
}

function RowCard({ row, onChanged }: { row: Row; onChanged: (r: Row | null) => void }) {
  const [busy, setBusy] = useState(false)

  // Only emails and webhooks can be replayed; labels are re-bought in Ship
  // orders (the backend refuses an automatic label purchase on purpose).
  const retriable = row.status === "failed" && row.kind !== "label" && !row.retried_at

  const retry = async () => {
    setBusy(true)
    try {
      const r = await api<{ retried?: boolean; message?: string }>(
        `/admin/ops-log/${row.id}/retry`,
        { method: "POST" }
      )
      toast.success(r.message ?? "Retried")
      onChanged({
        ...row,
        status: "ok",
        retried_at: new Date().toISOString(),
        detail: `${row.detail ?? ""}${row.detail ? " | " : ""}retried OK from Ops log`,
      })
    } catch (e: any) {
      toast.error(e.message)
      // The server recorded the attempt either way — refresh from there.
      onChanged(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-base px-5 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge size="2xsmall" color={row.kind === "email" ? "blue" : row.kind === "webhook" ? "purple" : "orange"}>
            {KIND_LABEL[row.kind]}
          </Badge>
          <Badge size="2xsmall" color={row.status === "ok" ? "green" : "red"}>
            {row.status === "ok" ? "OK" : "Failed"}
          </Badge>
          <Text size="small" className="font-mono text-ui-fg-subtle">
            {row.source}
          </Text>
          {row.reference && (
            <Text size="small" className="font-mono">
              {row.reference}
            </Text>
          )}
        </div>
        <div className="flex items-center gap-2">
          {row.order_id && (
            <a
              href={`/app/orders/${row.order_id}`}
              target="_blank"
              rel="noreferrer"
              className="text-ui-fg-subtle underline text-[12px]"
            >
              Open order
            </a>
          )}
          {row.status === "failed" && row.kind === "label" && (
            <a href={`/app/ship-orders`} className="text-ui-fg-subtle underline text-[12px]">
              Ship orders
            </a>
          )}
          {retriable && (
            <Button size="small" variant="secondary" isLoading={busy} onClick={retry}>
              Retry
            </Button>
          )}
          {row.retried_at && <Text size="xsmall" className="text-ui-fg-subtle">Retried {ago(row.retried_at)}</Text>}
          <Text size="xsmall" className="text-ui-fg-subtle">
            {ago(row.created_at)}
          </Text>
        </div>
      </div>
      {(row.email || row.detail) && (
        <div className="mt-2">
          {row.email && (
            <Text size="small" className="text-ui-fg-subtle">
              {row.email}
            </Text>
          )}
          {row.detail && <Text size="small" className="text-ui-fg-subtle">{row.detail}</Text>}
        </div>
      )}
    </div>
  )
}

const KINDS = ["", "email", "webhook", "label"] as const
const STATUSES = ["", "failed", "ok"] as const

const OpsLogPage = () => {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kind, setKind] = useState<string>("")
  const [status, setStatus] = useState<string>("failed")

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (kind) params.set("kind", kind)
      if (status) params.set("status", status)
      params.set("limit", "100")
      const { events } = await api<{ events: Row[] }>(`/admin/ops-log?${params.toString()}`)
      setRows(events)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
  }, [kind, status])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    const t = setInterval(load, 60_000)
    return () => clearInterval(t)
  }, [load])

  // A retry usually fixes a row or explains why it cannot be; reloading
  // brings both the new row and the updated one back onto screen.
  const notifyChanged = () => {
    load()
  }

  return (
    <Container className="p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div>
          <Heading level="h1">Ops log</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Every customer email, Easyship webhook and label purchase — retry the ones that failed.
          </Text>
        </div>
        <Button size="small" variant="secondary" onClick={load}>
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-y border-ui-border-base px-6 py-3">
        {KINDS.map((k) => (
          <Button
            key={k || "all"}
            size="small"
            variant={kind === k ? "primary" : "secondary"}
            onClick={() => setKind(k)}
          >
            {k ? KIND_LABEL[k as Row["kind"]] : "All kinds"}
          </Button>
        ))}
        <span className="mx-2 border-l border-ui-border-base" />
        {STATUSES.map((s) => (
          <Button
            key={s || "any"}
            size="small"
            variant={status === s ? "primary" : "secondary"}
            onClick={() => setStatus(s)}
          >
            {s ? (s === "ok" ? "OK" : "Failed") : "Any status"}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-6 py-5">
        {error && (
          <>
            <Text className="text-ui-fg-error">Couldn't load the log: {error}</Text>
            <Text size="small" className="text-ui-fg-subtle">
              (Ops log needs RESEND_API_KEY to exist for email rows; the module itself is always on.)
            </Text>
          </>
        )}
        {!rows && !error && <Text className="text-ui-fg-subtle">Loading…</Text>}
        {rows && rows.length === 0 && (
          <Text className="text-ui-fg-subtle">Nothing here — with these filters there are no {status === "failed" ? "failures" : "events"} yet.</Text>
        )}
        {rows?.map((r) => (
          <RowCard key={r.id} row={r} onChanged={notifyChanged} />
        ))}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Ops log",
  icon: DocumentText,
})

export default OpsLogPage
