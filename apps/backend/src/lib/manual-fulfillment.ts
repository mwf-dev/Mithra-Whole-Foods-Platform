import { AsyncLocalStorage } from "async_hooks"

/**
 * Runs `fn` with label buying switched off. The Easyship provider checks this
 * inside createFulfillment, so packing an order for our own delivery never
 * charges the courier account, even when its shipping option is an Easyship one.
 */
const store = new AsyncLocalStorage<{ manual: true }>()

export const runManualFulfillment = <T>(fn: () => Promise<T>): Promise<T> =>
  store.run({ manual: true }, fn)

export const isManualFulfillment = () => store.getStore()?.manual === true
