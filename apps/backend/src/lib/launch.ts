/**
 * Pre-launch order lock, the backend half of the storefront's
 * `NEXT_PUBLIC_ORDERS_OPEN` switch. Until `ORDERS_OPEN=true` is set on the
 * backend, `completeCartWorkflow` refuses every cart, so no order can be
 * placed through the Store API, however the request was made. Carts, browsing
 * and admin-side draft orders are unaffected.
 *
 * Read at call time (not module load) so a restart with the new env is all
 * it takes, and so tests can flip it.
 */
export function ordersOpen(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.ORDERS_OPEN ?? "").trim().toLowerCase() === "true"
}

/** When ordering opens, as shoppers read it in the error message. */
export const ORDERS_OPEN_WHEN = "November"

export const ORDERS_CLOSED_MESSAGE = `We are not taking orders yet. Orders open in ${ORDERS_OPEN_WHEN}.`
