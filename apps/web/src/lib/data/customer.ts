"use server"

import { sdk } from "@lib/config"
import medusaError from "@lib/util/medusa-error"
import { HttpTypes } from "@medusajs/types"
import { revalidateTag } from "next/cache"
import { redirect } from "next/navigation"
import {
  getAuthHeaders,
  getCacheOptions,
  getCacheTag,
  getCartCacheTag,
  getCartId,
  readCartMergeNotice,
  removeAuthToken,
  removeCartId,
  setAuthToken,
  setCartId,
  setCartMergeNotice,
} from "./cookies"
import { addressRules, validateFormFields } from "@lib/util/form-validation"

export const retrieveCustomer =
  async (): Promise<HttpTypes.StoreCustomer | null> => {
    const authHeaders = await getAuthHeaders()

    if (!authHeaders) return null

    const headers = {
      ...authHeaders,
    }

    const next = {
      ...(await getCacheOptions("customers")),
    }

    return await sdk.client
      .fetch<{ customer: HttpTypes.StoreCustomer }>(`/store/customers/me`, {
        method: "GET",
        query: {
          fields: "*orders",
        },
        headers,
        next,
        cache: "force-cache",
      })
      .then(({ customer }) => customer)
      .catch(() => null)
  }

export const updateCustomer = async (body: HttpTypes.StoreUpdateCustomer) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const updateRes = await sdk.store.customer
    .update(body, {}, headers)
    .then(({ customer }) => customer)
    .catch(medusaError)

  const cacheTag = await getCacheTag("customers")
  revalidateTag(cacheTag)

  return updateRes
}

export async function signup(_currentState: unknown, formData: FormData) {
  const { values, error } = validateFormFields(formData, {
    email: { label: "Email", required: true, maxLength: 255, kind: "email" },
    password: { label: "Password", required: true, minLength: 8, maxLength: 128 },
    first_name: { label: "First name", required: true, maxLength: 100 },
    last_name: { label: "Last name", required: true, maxLength: 100 },
    phone: { label: "Phone", maxLength: 32, kind: "phone" },
  })

  if (error) {
    return error
  }

  const password = values.password
  const customerForm = {
    email: values.email,
    first_name: values.first_name,
    last_name: values.last_name,
    phone: values.phone,
  }

  let createdCustomer
  try {
    const token = await sdk.auth.register("customer", "emailpass", {
      email: customerForm.email,
      password: password,
    })

    await setAuthToken(token as string)

    const headers = {
      ...(await getAuthHeaders()),
    }

    const created = await sdk.store.customer.create(
      customerForm,
      {},
      headers
    )
    createdCustomer = created.customer

    const loginToken = await sdk.auth.login("customer", "emailpass", {
      email: customerForm.email,
      password,
    })

    await setAuthToken(loginToken as string)

    const customerCacheTag = await getCacheTag("customers")
    revalidateTag(customerCacheTag)

    // A failed transfer must not read as a failed signup — the cart-mismatch
    // banner already offers a retry once the user is signed in.
    await transferCart().catch((error) => {
      console.error("Cart transfer after signup failed:", error)
    })
  } catch (error: any) {
    return error.toString()
  }

  // Return the new customer to wherever they came from (e.g. checkout).
  // Outside the try/catch so redirect()'s control-flow signal isn't swallowed.
  const redirectTo = formData.get("redirect")
  if (typeof redirectTo === "string" && redirectTo.startsWith("/")) {
    redirect(redirectTo)
  }

  return createdCustomer
}

export async function login(_currentState: unknown, formData: FormData) {
  const { values, error } = validateFormFields(formData, {
    email: { label: "Email", required: true, maxLength: 255, kind: "email" },
    password: { label: "Password", required: true, maxLength: 128 },
  })

  if (error) {
    return error
  }

  const { email, password } = values

  try {
    await sdk.auth
      .login("customer", "emailpass", { email, password })
      .then(async (token) => {
        await setAuthToken(token as string)
        const customerCacheTag = await getCacheTag("customers")
        revalidateTag(customerCacheTag)
      })
  } catch (error: any) {
    return error.toString()
  }

  // A failed transfer must not read as a failed login — the cart-mismatch
  // banner already offers a retry once the user is signed in.
  await transferCart().catch((error) => {
    console.error("Cart transfer after login failed:", error)
  })

  // Return the shopper to wherever they came from (e.g. checkout).
  const redirectTo = formData.get("redirect")
  if (typeof redirectTo === "string" && redirectTo.startsWith("/")) {
    redirect(await resolvePostLoginRedirect(redirectTo))
  }
}

/**
 * Signing in can pull in items from the shopper's other device. When that
 * happens on the way to checkout, send them to the cart instead: they must see
 * what changed and choose to continue, rather than land on payment holding a
 * total they never assembled.
 */
async function resolvePostLoginRedirect(redirectTo: string): Promise<string> {
  const merged = await readCartMergeNotice()

  if (!merged.length) {
    return redirectTo
  }

  const path = redirectTo.split("?")[0]
  const countryCode = redirectTo.split("/")[1]

  if (!countryCode || !path.endsWith("/checkout")) {
    return redirectTo
  }

  return `/${countryCode}/cart`
}

export async function signout(countryCode: string) {
  // Captured before the cookie is dropped — afterwards there is no id left to
  // build the cache tag from.
  const cartId = await getCartId()

  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  await removeCartId()

  await revalidateCarts(cartId)

  redirect(`/${countryCode}/account`)
}

/** A cart as returned by `GET /store/customers/me/carts`. */
type OpenAccountCart = {
  id: string
  region_id: string | null
  created_at: string | null
  updated_at: string | null
  items: {
    id: string
    variant_id: string | null
    title: string | null
    quantity: number
    thumbnail: string | null
  }[]
}

/**
 * Reunites every device on a single cart at sign-in.
 *
 * Cart identity lives in the `_medusa_cart_id` cookie, and Medusa is happy to
 * let one customer own several carts at once, so a shopper's phone and laptop
 * each built their own and nothing reconciled them. Here we pick one survivor —
 * the customer's most recently touched cart — fold every other cart they own
 * into it, and point this browser at it. Sign in on each device and they all
 * converge on the same cart, so a removal on one is a removal on all.
 *
 * Quantities take the higher of the two rather than summing: the same item
 * added on two devices means "I want this", not "I want it twice", and silently
 * doubling a grocery order is the more expensive mistake.
 *
 * Donor account carts are emptied once drained. Leaving their items behind
 * would let the next sign-in fold them back in and resurrect items the shopper
 * had deleted.
 */
export async function transferCart() {
  const cartId = await getCartId()
  const headers = await getAuthHeaders()

  const localCart = cartId ? await fetchCartLite(cartId, headers) : null

  // A stale cookie pointing at a deleted or already-ordered cart: drop it so
  // the next add-to-cart starts clean.
  if (cartId && !localCart) {
    await removeCartId()
  }

  const accountCarts = await listOpenAccountCarts(headers)

  // Adopting a cart priced in another region would silently reprice the order.
  const regionId = localCart?.region_id ?? null
  const candidates = regionId
    ? accountCarts.filter((cart) => cart.region_id === regionId)
    : accountCarts

  // The customer's oldest cart wins, as ordered by the backend. It has to be
  // the same pick from every device and it has to not move: merging writes to
  // carts, so anything derived from `updated_at` would let two devices choose
  // differently and strand one on a cart the other had just drained.
  const survivor = candidates[0] ?? null

  // The customer owns no cart yet: this browser's becomes their account cart,
  // which is what their other devices will find and adopt.
  if (!survivor) {
    if (!cartId || !localCart) {
      return
    }

    try {
      await sdk.store.cart.transferCart(cartId, {}, headers)
    } catch (error: any) {
      const recovered = await recoverFailedCartTransfer(cartId, headers, error)

      if (!recovered) {
        throw error
      }
    }

    await revalidateCarts(cartId)
    return
  }

  const donorCarts = candidates.filter((cart) => cart.id !== survivor.id)

  const localVariantIds = new Set(
    (localCart?.items ?? [])
      .map((item) => item.variant_id)
      .filter((id): id is string => !!id)
  )

  // What the shopper is about to see for the first time, measured against the
  // cart this browser was actually showing them.
  const appeared: { title: string; quantity: number; thumbnail: string | null }[] =
    []
  const appearedSeen = new Set<string>()

  for (const item of [
    ...survivor.items,
    ...donorCarts.flatMap((cart) => cart.items),
  ]) {
    if (!item.variant_id || localVariantIds.has(item.variant_id)) {
      continue
    }

    if (appearedSeen.has(item.variant_id)) {
      continue
    }

    appearedSeen.add(item.variant_id)
    appeared.push({
      title: item.title ?? "Item",
      quantity: item.quantity,
      thumbnail: item.thumbnail ?? null,
    })
  }

  // Resolve every donor down to one quantity per variant before touching the
  // backend, so each variant costs a single call no matter how many carts it
  // appears in — and so a freshly created line never needs its id looked up.
  const wanted = new Map<string, number>()

  for (const item of [
    ...(localCart?.items ?? []),
    ...donorCarts.flatMap((cart) => cart.items),
  ]) {
    if (!item.variant_id) {
      continue
    }

    wanted.set(
      item.variant_id,
      Math.max(wanted.get(item.variant_id) ?? 0, item.quantity)
    )
  }

  await applyToSurvivor(survivor, wanted, headers)

  for (const donor of donorCarts) {
    await drainCart(donor, headers)
    // Other devices are holding this cart; purge their cached read of it.
    await revalidateCarts(donor.id)
  }

  await setCartId(survivor.id)
  await setCartMergeNotice(appeared)

  // The survivor, not the cookie: `setCartId` above is not guaranteed to be
  // readable back within this same request.
  await revalidateCarts(survivor.id)
}

/**
 * Every open cart the customer owns, oldest first — the backend fixes that
 * order deliberately so the survivor pick is identical on every device. Empty
 * carts are included: an empty cart still carries identity, and ignoring one is
 * what lets two devices drift apart again.
 */
async function listOpenAccountCarts(
  headers: { authorization: string } | {}
): Promise<OpenAccountCart[]> {
  return await sdk.client
    .fetch<{ carts: OpenAccountCart[] }>(`/store/customers/me/carts`, {
      method: "GET",
      headers,
      cache: "no-store",
    })
    .then(({ carts }) => carts ?? [])
    .catch((error) => {
      console.error("Could not list the customer's carts:", error)
      return [] as OpenAccountCart[]
    })
}

/**
 * Brings the survivor up to the merged quantities. Line items go through the
 * store API rather than being copied, so pricing resolves in the survivor's own
 * region context instead of being carried over stale.
 *
 * One unpurchasable item must not block a sign-in — a variant can lose its
 * price between sessions — so failures are logged and skipped.
 */
async function applyToSurvivor(
  survivor: OpenAccountCart,
  wanted: Map<string, number>,
  headers: { authorization: string } | {}
) {
  const existing = new Map(
    survivor.items
      .filter((item) => item.variant_id)
      .map((item) => [item.variant_id as string, item])
  )

  for (const [variantId, quantity] of Array.from(wanted.entries())) {
    const current = existing.get(variantId)

    try {
      if (!current) {
        await sdk.store.cart.createLineItem(
          survivor.id,
          { variant_id: variantId, quantity },
          {},
          headers
        )
      } else if (quantity > current.quantity) {
        await sdk.store.cart.updateLineItem(
          survivor.id,
          current.id,
          { quantity },
          {},
          headers
        )
      }
    } catch (error) {
      console.error(
        `Could not merge variant ${variantId} into cart ${survivor.id}:`,
        error
      )
    }
  }
}

/** Empties a donor cart once its items are safely on the survivor. */
async function drainCart(
  cart: OpenAccountCart,
  headers: { authorization: string } | {}
) {
  for (const item of cart.items) {
    try {
      await sdk.store.cart.deleteLineItem(cart.id, item.id, {}, headers)
    } catch (error) {
      console.error(
        `Could not drain item ${item.id} from cart ${cart.id}:`,
        error
      )
    }
  }
}

type CartLite = {
  id: string
  region_id: string | null
  completed_at: string | null
  items: { id: string; variant_id: string | null; quantity: number }[]
}

/**
 * Fetched through `sdk.client` rather than `retrieveCart` from `./cart`, which
 * already imports this module — importing it back would make the cycle real.
 */
async function fetchCartLite(
  cartId: string,
  headers: { authorization: string } | {}
): Promise<CartLite | null> {
  const cart = await sdk.client
    .fetch<{ cart: CartLite }>(`/store/carts/${cartId}`, {
      method: "GET",
      query: { fields: "id,region_id,completed_at,*items" },
      headers,
      cache: "no-store",
    })
    .then(({ cart }) => cart)
    .catch(() => null)

  return cart && !cart.completed_at ? cart : null
}

/**
 * Purges the cached read of one cart for every device holding it. Tagged by
 * cart id, not by browser — see `getCartCacheTag`.
 */
async function revalidateCarts(cartId?: string) {
  const tag = await getCartCacheTag(cartId)

  if (tag) {
    revalidateTag(tag)
  }
}

/**
 * The transfer endpoint force-refreshes every cart item, so it throws when the
 * cart cookie is stale (cart deleted server-side) or when an item's variant
 * has been removed or no longer has a price in the cart's currency — e.g.
 * carts created before a catalog re-import. Recover instead of leaving the
 * customer stuck on "Run transfer again".
 * @returns true when the situation was resolved and the failure can be ignored.
 */
async function recoverFailedCartTransfer(
  cartId: string,
  headers: { authorization: string } | {},
  error: any
): Promise<boolean> {
  const message = String(error?.message ?? error ?? "")
  console.error(`Cart transfer failed for ${cartId}: ${message}`)

  const cart = await sdk.client
    .fetch<HttpTypes.StoreCartResponse>(`/store/carts/${cartId}`, {
      method: "GET",
      query: { fields: "id,completed_at,*items" },
      headers,
      cache: "no-store",
    })
    .then(({ cart }) => cart)
    .catch(() => null)

  // Stale cookie: the cart is gone or already completed — drop it so the
  // customer starts a fresh cart on their next add-to-cart.
  if (!cart || cart.completed_at) {
    await removeCartId()
    return true
  }

  // Remove items whose variants the backend reported as unpurchasable, then
  // retry the transfer once.
  const brokenVariantIds: string[] = message.match(/variant_[A-Za-z0-9]+/g) ?? []
  const brokenItems = (cart.items ?? []).filter(
    (item) => item.variant_id && brokenVariantIds.includes(item.variant_id)
  )

  if (!brokenItems.length) {
    return false
  }

  for (const item of brokenItems) {
    await sdk.store.cart
      .deleteLineItem(cartId, item.id, {}, headers)
      .catch(() => {})
  }

  try {
    await sdk.store.cart.transferCart(cartId, {}, headers)
    return true
  } catch (retryError: any) {
    console.error(
      `Cart transfer retry failed for ${cartId}: ${retryError?.message ?? retryError}`
    )
    return false
  }
}

export const addCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const isDefaultBilling = (currentState.isDefaultBilling as boolean) || false
  const isDefaultShipping = (currentState.isDefaultShipping as boolean) || false

  const { values, error } = validateFormFields(formData, addressRules())
  if (error) {
    return { success: false, error }
  }

  const address = {
    first_name: values.first_name,
    last_name: values.last_name,
    company: values.company,
    address_1: values.address_1,
    address_2: values.address_2,
    city: values.city,
    postal_code: values.postal_code,
    province: values.province,
    country_code: values.country_code,
    phone: values.phone,
    is_default_billing: isDefaultBilling,
    is_default_shipping: isDefaultShipping,
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .createAddress(address, {}, headers)
    .then(async ({ customer }) => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const deleteCustomerAddress = async (
  addressId: string
): Promise<void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  await sdk.store.customer
    .deleteAddress(addressId, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}

export const updateCustomerAddress = async (
  currentState: Record<string, unknown>,
  formData: FormData
): Promise<any> => {
  const addressId =
    (currentState.addressId as string) || (formData.get("addressId") as string)

  if (!addressId) {
    return { success: false, error: "Address ID is required" }
  }

  const { values, error } = validateFormFields(formData, addressRules())
  if (error) {
    return { success: false, error }
  }

  const address = {
    first_name: values.first_name,
    last_name: values.last_name,
    company: values.company,
    address_1: values.address_1,
    address_2: values.address_2,
    city: values.city,
    postal_code: values.postal_code,
    province: values.province,
    country_code: values.country_code,
  } as HttpTypes.StoreUpdateCustomerAddress

  if (values.phone) {
    address.phone = values.phone
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.store.customer
    .updateAddress(addressId, address, {}, headers)
    .then(async () => {
      const customerCacheTag = await getCacheTag("customers")
      revalidateTag(customerCacheTag)
      return { success: true, error: null }
    })
    .catch((err) => {
      return { success: false, error: err.toString() }
    })
}
