import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { removeOrphanedCartItems } from "../cart-cleanup"

type GraphResult = { data: any[] }

/**
 * Builds a fake MedusaContainer whose `resolve` returns stub logger / query /
 * cart-module implementations. `query.graph` is dispatched by the `entity`
 * argument so the two calls in removeOrphanedCartItems (cart, then
 * product_variant) return the right fixtures.
 */
function buildContainer(opts: {
  carts: any[]
  existingVariantIds: string[]
  deleteLineItems: jest.Mock
}) {
  const query = {
    graph: jest.fn(async ({ entity }: { entity: string }): Promise<GraphResult> => {
      if (entity === "cart") {
        return { data: opts.carts }
      }
      if (entity === "product_variant") {
        return { data: opts.existingVariantIds.map((id) => ({ id })) }
      }
      throw new Error(`unexpected entity ${entity}`)
    }),
  }

  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const cartModule = { deleteLineItems: opts.deleteLineItems }

  const container = {
    resolve: (key: string) => {
      if (key === ContainerRegistrationKeys.LOGGER) return logger
      if (key === ContainerRegistrationKeys.QUERY) return query
      if (key === Modules.CART) return cartModule
      throw new Error(`unexpected resolve ${key}`)
    },
  }

  return { container: container as any, query, logger, cartModule }
}

describe("removeOrphanedCartItems", () => {
  it("removes items whose variant no longer exists and returns the count", async () => {
    const deleteLineItems = jest.fn().mockResolvedValue(undefined)
    const { container } = buildContainer({
      carts: [
        {
          id: "cart_1",
          completed_at: null,
          items: [
            { id: "li_ok", title: "Millets", variant_id: "var_live" },
            { id: "li_orphan", title: "Gone", variant_id: "var_deleted" },
          ],
        },
      ],
      existingVariantIds: ["var_live"], // var_deleted is missing
      deleteLineItems,
    })

    const removed = await removeOrphanedCartItems(container)

    expect(removed).toBe(1)
    expect(deleteLineItems).toHaveBeenCalledWith(["li_orphan"])
  })

  it("treats items with no variant_id as orphaned", async () => {
    const deleteLineItems = jest.fn().mockResolvedValue(undefined)
    const { container } = buildContainer({
      carts: [
        {
          id: "cart_1",
          completed_at: null,
          items: [{ id: "li_novariant", title: "Custom", variant_id: null }],
        },
      ],
      existingVariantIds: [],
      deleteLineItems,
    })

    const removed = await removeOrphanedCartItems(container)

    expect(removed).toBe(1)
    expect(deleteLineItems).toHaveBeenCalledWith(["li_novariant"])
  })

  it("ignores completed carts", async () => {
    const deleteLineItems = jest.fn()
    const { container } = buildContainer({
      carts: [
        {
          id: "cart_done",
          completed_at: "2026-07-01",
          items: [{ id: "li_x", title: "X", variant_id: "var_deleted" }],
        },
      ],
      existingVariantIds: [],
      deleteLineItems,
    })

    const removed = await removeOrphanedCartItems(container)

    expect(removed).toBe(0)
    expect(deleteLineItems).not.toHaveBeenCalled()
  })

  it("no-ops when every item's variant still exists", async () => {
    const deleteLineItems = jest.fn()
    const { container } = buildContainer({
      carts: [
        {
          id: "cart_1",
          completed_at: null,
          items: [{ id: "li_ok", title: "Millets", variant_id: "var_live" }],
        },
      ],
      existingVariantIds: ["var_live"],
      deleteLineItems,
    })

    const removed = await removeOrphanedCartItems(container)

    expect(removed).toBe(0)
    expect(deleteLineItems).not.toHaveBeenCalled()
  })
})
