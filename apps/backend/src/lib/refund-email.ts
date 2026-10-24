export function formatMoney(amount: number | string, currency?: string | null): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: (currency || "usd").toUpperCase(),
  }).format(Number(amount))
}

/** Amount of the most recent refund on a payment, or null when unknown. */
export function latestRefundAmount(refunds: { amount?: unknown; created_at?: unknown }[] | null | undefined): number | null {
  const list = (refunds ?? []).filter((r) => r && Number.isFinite(Number(r.amount)))
  if (!list.length) return null
  const latest = list.reduce((a, b) =>
    new Date(String(b.created_at ?? 0)).getTime() >= new Date(String(a.created_at ?? 0)).getTime() ? b : a
  )
  return Number(latest.amount)
}
