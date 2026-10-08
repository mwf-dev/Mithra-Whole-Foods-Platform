import RedisEventBusModule from "@medusajs/medusa/event-bus-redis"

/**
 * Medusa's Redis event bus with one startup bug fixed.
 *
 * In @medusajs/event-bus-redis 2.17.0, `onApplicationStart` does
 * `await this.bullWorker_.run()`. BullMQ's `Worker.run()` is the worker's main
 * loop and only resolves when the worker is closed, so the application-start
 * hook never returns and `medusa start` hangs before "Server is ready": the
 * health check times out and the deploy fails. That is why REDIS_URL had to be
 * removed from production twice (2026-07 and 2026-09-29).
 *
 * Upstream fixed it later (2.21.x) by starting the loop without awaiting it
 * (https://github.com/taskforcesh/bullmq/issues/2128). This backports exactly
 * that. Delete this module and point medusa-config back at
 * "@medusajs/medusa/event-bus-redis" once Medusa is upgraded past the fix.
 */
const BaseService = RedisEventBusModule.service as unknown as new (
  ...args: any[]
) => any

// Must keep the upstream class name: BullMQ prefixes the queue with
// `this.constructor.name`, so renaming it would orphan queued events.
class RedisEventBusService extends BaseService {
  constructor(...args: any[]) {
    super(...args)
    this.__hooks = {
      ...this.__hooks,
      onApplicationStart: async () => {
        if (!this.bullWorker_) {
          return
        }
        void this.bullWorker_.run().catch((error: Error) => {
          this.logger_?.error(`Error running event bus worker: ${error.message}`, error)
        })
      },
    }
  }
}

export default {
  ...RedisEventBusModule,
  service: RedisEventBusService,
}
