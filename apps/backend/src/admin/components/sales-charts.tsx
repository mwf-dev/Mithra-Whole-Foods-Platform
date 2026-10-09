import { Button, Heading, Text } from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"

/**
 * Dashboard "Sales" section: plain inline-SVG charts, no chart library.
 * Colours: slot 1 blue / slot 2 orange from the validated categorical palette,
 * with their own dark-mode steps. Every chart has a hover tooltip and a
 * "View as table" fallback so nothing is colour-only or hover-only.
 */
type Stats = {
  days: number
  totals: {
    sales: number
    orders: number
    avg_order: number
    units: number
    sales_change_pct: number | null
    orders_change_pct: number | null
  }
  daily: { date: string; orders: number; sales: number }[]
  top_products: { title: string; units: number; sales: number }[]
  pipeline: { to_ship: number; label_ready: number; shipped: number; delivered: number }
  payment_mix: { card: number; cod: number; unpaid: number }
  low_stock: { id: string; title: string; stock: number | null }[]
}

const RANGES = [7, 30, 90] as const

const STYLE = `
.sales-viz{--viz-1:#2a78d6;--viz-2:#eb6834;--viz-text:var(--fg-base,#111);--viz-muted:var(--fg-muted,#6b7280);--viz-grid:var(--border-base,#e5e7eb);--viz-surface:var(--bg-base,#fff)}
.dark .sales-viz{--viz-1:#3987e5;--viz-2:#d95926}
.sales-viz .tip{position:absolute;pointer-events:none;transform:translate(-50%,-110%);background:var(--viz-surface);color:var(--viz-text);border:1px solid var(--viz-grid);border-radius:8px;padding:6px 10px;font-size:12px;line-height:1.35;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.18)}
`

const usd = (n: number, digits = 0) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n)

const shortDate = (iso: string) =>
  new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })

/** Round a maximum up to a tidy axis ceiling (1, 2, 2.5, 5 × 10ⁿ). */
export function niceMax(v: number): number {
  if (v <= 0) return 1
  const exp = Math.pow(10, Math.floor(Math.log10(v)))
  for (const m of [1, 2, 2.5, 5, 10]) if (v <= m * exp) return m * exp
  return 10 * exp
}

function Delta({ pct, label }: { pct: number | null; label: string }) {
  if (pct === null) return <Text size="xsmall" className="text-ui-fg-muted">No earlier sales to compare</Text>
  const up = pct >= 0
  return (
    <Text size="xsmall" className="text-ui-fg-subtle">
      <span aria-hidden>{up ? "▲" : "▼"}</span> {up ? "Up" : "Down"} {Math.abs(pct)}% {label}
    </Text>
  )
}

function Tile({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle p-4">
      <Text size="small" className="text-ui-fg-subtle font-medium">{label}</Text>
      <Heading level="h1" className="mt-1 text-2xl font-semibold">{value}</Heading>
      {children}
    </div>
  )
}

function Panel({
  title,
  subtitle,
  table,
  children,
}: {
  title: string
  subtitle?: string
  table: { head: string[]; rows: (string | number)[][] }
  children: React.ReactNode
}) {
  const [asTable, setAsTable] = useState(false)
  return (
    <div className="rounded-xl border border-ui-border-base p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <Heading level="h3" className="text-base font-semibold">{title}</Heading>
          {subtitle && <Text size="xsmall" className="text-ui-fg-muted">{subtitle}</Text>}
        </div>
        <Button size="small" variant="transparent" onClick={() => setAsTable((v) => !v)}>
          {asTable ? "View chart" : "View as table"}
        </Button>
      </div>
      {asTable ? (
        <div className="max-h-64 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>{table.head.map((h) => <th key={h} className="px-2 py-1 text-left font-medium text-ui-fg-subtle">{h}</th>)}</tr>
            </thead>
            <tbody>
              {table.rows.map((r, i) => (
                <tr key={i} className="border-t border-ui-border-base">
                  {r.map((c, j) => <td key={j} className="px-2 py-1">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        children
      )}
    </div>
  )
}

const W = 640
const H = 200
const M = { l: 48, r: 8, t: 10, b: 24 }

function BarChart({
  data,
  color,
  format,
  tipFormat,
  unit,
}: {
  data: { date: string; value: number }[]
  color: string
  format: (n: number) => string
  /** Precise value for the tooltip; defaults to the axis format. */
  tipFormat?: (n: number) => string
  unit: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const innerW = W - M.l - M.r
  const innerH = H - M.t - M.b
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)))
  const slot = innerW / Math.max(data.length, 1)
  const barW = Math.min(Math.max(slot * 0.62, 3), 26)
  const y = (v: number) => M.t + innerH - (v / max) * innerH
  const ticks = [0, max / 2, max]
  const labelEvery = Math.ceil(data.length / 6)
  const empty = data.every((d) => d.value === 0)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${unit} per day`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} stroke="var(--viz-grid)" strokeWidth={1} />
            <text x={M.l - 8} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--viz-muted)">{format(t)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = M.l + slot * i + slot / 2
          const h = (d.value / max) * innerH
          const x = cx - barW / 2
          const r = Math.min(4, barW / 2, h)
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {d.value > 0 && (
                <path
                  d={`M${x},${y(0)} V${y(d.value) + r} Q${x},${y(d.value)} ${x + r},${y(d.value)} H${x + barW - r} Q${x + barW},${y(d.value)} ${x + barW},${y(d.value) + r} V${y(0)} Z`}
                  fill={color}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
              <rect x={cx - slot / 2} y={M.t} width={slot} height={innerH} fill="transparent" />
              {i % labelEvery === 0 && (
                <text x={cx} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--viz-muted)">{shortDate(d.date)}</text>
              )}
            </g>
          )
        })}
        {empty && (
          <text x={W / 2} y={H / 2} textAnchor="middle" fontSize={13} fill="var(--viz-muted)">
            No orders in this period yet
          </text>
        )}
      </svg>
      {hover !== null && (
        <div className="tip" style={{ left: `${((M.l + slot * hover + slot / 2) / W) * 100}%`, top: `${(y(data[hover].value) / H) * 100}%` }}>
          <strong>{shortDate(data[hover].date)}</strong>
          <br />
          {(tipFormat ?? format)(data[hover].value)} {unit}
        </div>
      )}
    </div>
  )
}

function HBars({ rows }: { rows: { title: string; units: number; sales: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.sales))
  if (!rows.length) return <Text size="small" className="text-ui-fg-muted">No sales in this period yet.</Text>
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.title} title={`${r.units} sold · ${usd(r.sales, 2)}`}>
          <div className="flex justify-between gap-3 text-sm">
            <span className="truncate">{r.title}</span>
            <span className="shrink-0 text-ui-fg-subtle">{r.units} sold · {usd(r.sales, 2)}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-ui-bg-subtle">
            <div className="h-2 rounded-full" style={{ width: `${Math.max((r.sales / max) * 100, 2)}%`, background: "var(--viz-1)" }} />
          </div>
        </li>
      ))}
    </ul>
  )
}

function PaymentMix({ mix }: { mix: Stats["payment_mix"] }) {
  const parts = [
    { key: "Paid by card", n: mix.card, color: "var(--viz-1)" },
    { key: "Pay on delivery", n: mix.cod, color: "var(--viz-2)" },
    ...(mix.unpaid ? [{ key: "Unpaid", n: mix.unpaid, color: "var(--viz-muted)" }] : []),
  ]
  const total = parts.reduce((n, p) => n + p.n, 0)
  if (!total) return <Text size="small" className="text-ui-fg-muted">No orders in this period yet.</Text>
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full" style={{ gap: 2 }}>
        {parts.filter((p) => p.n).map((p) => (
          <div key={p.key} title={`${p.key}: ${p.n}`} style={{ width: `${(p.n / total) * 100}%`, background: p.color }} />
        ))}
      </div>
      <ul className="mt-3 flex flex-col gap-1 text-sm">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            {p.key}: <strong>{p.n}</strong> <span className="text-ui-fg-muted">({Math.round((p.n / total) * 100)}%)</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function SalesCharts() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30)
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStats(null)
    fetch(`/admin/dashboard-stats?days=${days}`, { credentials: "include" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({})))?.message || `Request failed (${r.status})`)
        return r.json()
      })
      .then((s) => {
        setStats(s)
        setError(null)
      })
      .catch((e) => setError(e.message))
  }, [days])

  const sales = useMemo(() => stats?.daily.map((d) => ({ date: d.date, value: d.sales })) ?? [], [stats])
  const orders = useMemo(() => stats?.daily.map((d) => ({ date: d.date, value: d.orders })) ?? [], [stats])
  const vs = `vs the previous ${days} days`

  return (
    <div className="sales-viz flex flex-col gap-4 p-6">
      <style>{STYLE}</style>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Heading level="h2" className="text-base font-semibold">Sales</Heading>
          <Text size="xsmall" className="text-ui-fg-muted">Every order placed, in US dollars, by day (store time).</Text>
        </div>
        <div className="flex gap-2" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <Button key={r} size="small" variant={days === r ? "primary" : "secondary"} onClick={() => setDays(r)}>
              {r} days
            </Button>
          ))}
        </div>
      </div>

      {error && <Text className="text-ui-fg-error">Couldn't load sales: {error}</Text>}
      {!stats && !error && <Text className="text-ui-fg-subtle">Loading…</Text>}

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Tile label="Sales" value={usd(stats.totals.sales, 2)}>
              <Delta pct={stats.totals.sales_change_pct} label={vs} />
            </Tile>
            <Tile label="Orders" value={String(stats.totals.orders)}>
              <Delta pct={stats.totals.orders_change_pct} label={vs} />
            </Tile>
            <Tile label="Average order" value={usd(stats.totals.avg_order, 2)} />
            <Tile label="Items sold" value={String(stats.totals.units)} />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel
              title="Sales per day"
              table={{ head: ["Day", "Sales"], rows: stats.daily.map((d) => [shortDate(d.date), usd(d.sales, 2)]) }}
            >
              <BarChart data={sales} color="var(--viz-1)" format={(n) => usd(n)} tipFormat={(n) => usd(n, 2)} unit="in sales" />
            </Panel>
            <Panel
              title="Orders per day"
              table={{ head: ["Day", "Orders"], rows: stats.daily.map((d) => [shortDate(d.date), d.orders]) }}
            >
              <BarChart data={orders} color="var(--viz-1)" format={(n) => String(Math.round(n * 10) / 10)} unit="orders" />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel
              title="Best sellers"
              subtitle="By sales in this period"
              table={{ head: ["Product", "Sold", "Sales"], rows: stats.top_products.map((p) => [p.title, p.units, usd(p.sales, 2)]) }}
            >
              <HBars rows={stats.top_products} />
            </Panel>
            <Panel
              title="How customers pay"
              subtitle="Orders in this period"
              table={{
                head: ["Method", "Orders"],
                rows: [["Paid by card", stats.payment_mix.card], ["Pay on delivery", stats.payment_mix.cod], ["Unpaid", stats.payment_mix.unpaid]],
              }}
            >
              <PaymentMix mix={stats.payment_mix} />
            </Panel>
            <div className="rounded-xl border border-ui-border-base p-4">
              <Heading level="h3" className="text-base font-semibold">Running low</Heading>
              <Text size="xsmall" className="mb-3 text-ui-fg-muted">Products on sale with 10 or fewer in stock</Text>
              {stats.low_stock.length === 0 ? (
                <Text size="small" className="text-ui-fg-muted">Everything on sale is well stocked.</Text>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {stats.low_stock.map((p) => (
                    <li key={p.id} className="flex justify-between gap-3">
                      <span className="truncate">{p.title}</span>
                      <strong className="shrink-0">{p.stock === 0 ? "Out of stock" : `${p.stock} left`}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div>
            <Heading level="h3" className="mb-2 text-base font-semibold">Order pipeline</Heading>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {(
                [
                  ["To ship", stats.pipeline.to_ship],
                  ["Label ready", stats.pipeline.label_ready],
                  ["Shipped", stats.pipeline.shipped],
                  ["Delivered", stats.pipeline.delivered],
                ] as const
              ).map(([label, n]) => (
                <a key={label} href="/app/ship-orders" className="rounded-xl border border-ui-border-base p-3 hover:bg-ui-bg-subtle">
                  <Text size="small" className="text-ui-fg-subtle">{label}</Text>
                  <Heading level="h2" className="text-2xl font-semibold">{n}</Heading>
                </a>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
