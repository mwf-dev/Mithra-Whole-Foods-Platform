import { MedusaContainer } from "@medusajs/framework"
import {
  listConnectionState,
  testConnection,
} from "../lib/platform-monitor/connections"
import { buildOverview } from "../lib/platform-monitor/collector"
import { canEncrypt } from "../lib/platform-monitor/crypto"

/**
 * Read-only diagnostic for the infrastructure portal. Prints which platforms
 * are configured, where each credential came from, the live result of every
 * connectivity check, and the most recent stored usage snapshot.
 *
 *   npx medusa exec ./src/scripts/diagnose-platform-monitor.ts
 *
 * Exists for the same reason `diagnose-fulfillment.ts` does: the admin UI needs
 * a logged-in session, and when you are debugging *why* the portal is empty you
 * want the answer without one. It writes nothing except the cached
 * `last_status` on each connection — the same field the dashboard would set.
 *
 * `--no-test` skips the outbound vendor calls and prints stored state only.
 */
export default async function diagnose({
  container,
  args,
}: {
  container: MedusaContainer
  args: string[]
}) {
  const skipTests = args?.includes("--no-test")

  console.log("\n=== ENCRYPTION ===")
  console.log(
    canEncrypt()
      ? "OK — a secret is available to encrypt stored credentials"
      : "MISSING — set PLATFORM_MONITOR_SECRET (or COOKIE_SECRET); credentials cannot be stored from the admin UI"
  )

  const connections = await listConnectionState(container)

  console.log("\n=== CONNECTIONS ===")
  for (const c of connections) {
    const sources = Object.entries(c.field_sources)
      .map(([k, v]) => `${k}:${v}`)
      .join(", ")

    console.log(
      `- ${c.label.padEnd(34)} ${(c.configured ? "configured" : "NOT CONFIGURED").padEnd(16)}` +
        ` last=${c.last_status}` +
        (sources ? ` [${sources}]` : "")
    )
    if (!c.configured) {
      console.log(`    missing: ${c.missing_fields.join(", ")}`)
    }
    if (c.last_status_detail) {
      console.log(`    detail: ${c.last_status_detail}`)
    }
  }

  if (!skipTests) {
    console.log("\n=== LIVE CONNECTIVITY ===")
    for (const c of connections) {
      const result = await testConnection(container, c.provider)
      console.log(`- ${c.label.padEnd(34)} ${result.ok ? "OK " : "FAIL"} ${result.detail}`)
    }
  }

  const overview = await buildOverview(container)

  console.log("\n=== LATEST SNAPSHOTS ===")
  for (const p of overview.providers) {
    if (!p.captured_at) {
      console.log(`- ${p.label}: never collected`)
      continue
    }
    console.log(
      `- ${p.label} (captured ${new Date(p.captured_at).toISOString()}, cycle ${p.cycle_elapsed_pct}% elapsed)`
    )
    for (const m of p.metrics) {
      const limit = m.limit !== null ? ` / ${m.limit}` : ""
      const projected = m.projected !== null ? ` → ${m.projected} projected` : ""
      console.log(
        `    ${m.label.padEnd(32)} ${String(m.current ?? "—").padStart(10)}${limit}${projected}  [${m.status}]`
      )
      if (m.projection_note) {
        console.log(`        note: ${m.projection_note}`)
      }
    }
  }

  console.log("\n=== OPEN ALERTS ===")
  if (!overview.alerts.length) {
    console.log("none")
  }
  for (const a of overview.alerts) {
    console.log(`- [${a.severity}] ${a.message}`)
  }

  console.log(
    `\nOverall: ${overview.overall_status} · estimated cycle cost $${overview.estimated_cycle_cost_usd}\n`
  )
}
