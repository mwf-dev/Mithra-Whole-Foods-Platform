import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

/**
 * Lists the signed-in customer's open carts, most recently updated first.
 *
 * Medusa's store API has no way to ask "which carts are mine" — `/store/carts`
 * only accepts POST, and a cart is otherwise reachable only if you already know
 * its id. Cart identity therefore lives entirely in the `_medusa_cart_id`
 * cookie, which is why a shopper's phone and laptop each end up with their own
 * cart. The storefront uses this to reunite them on sign-in.
 *
 * Auth is not handled here on purpose: Medusa registers
 * `authenticate("customer")` against the `/store/customers/me*` matcher, so
 * `actor_id` below is always the caller. Carts are never selected by an id
 * supplied by the client, so this cannot be used to read someone else's cart.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const customerId = req.auth_context?.actor_id

  if (!customerId) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: carts } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "region_id",
      "currency_code",
      "created_at",
      "updated_at",
      "completed_at",
      "items.id",
      "items.variant_id",
      "items.product_id",
      "items.title",
      "items.quantity",
      "items.thumbnail",
    ],
    filters: { customer_id: customerId },
  })

  // Empty carts are deliberately kept. They carry no items worth reuniting
  // anyone with, but they still carry *identity*: if a shopper empties their
  // cart on one device and the other device can't see that cart, it starts a
  // fresh one and the two diverge again — which is the whole bug this exists to
  // kill. Completed carts are excluded: those are orders.
  //
  // Ordered by created_at, oldest first, and NOT by updated_at. The storefront
  // takes the first as the one true cart, so that choice has to be identical on
  // every device and stable over time. `updated_at` is neither: merging writes
  // to carts, so each sign-in would reshuffle the order and devices would pick
  // different survivors, stranding one of them on a cart the other just
  // drained. `created_at` never moves.
  const open = (carts ?? [])
    .filter((cart) => !cart.completed_at)
    .sort(
      (a, b) =>
        new Date(a.created_at ?? 0).getTime() -
        new Date(b.created_at ?? 0).getTime()
    )

  res.json({ carts: open })
}
