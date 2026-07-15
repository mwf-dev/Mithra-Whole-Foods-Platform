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
  getCartId,
  removeAuthToken,
  removeCartId,
  setAuthToken,
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
    redirect(redirectTo)
  }
}

export async function signout(countryCode: string) {
  await sdk.auth.logout()

  await removeAuthToken()

  const customerCacheTag = await getCacheTag("customers")
  revalidateTag(customerCacheTag)

  await removeCartId()

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)

  redirect(`/${countryCode}/account`)
}

export async function transferCart() {
  const cartId = await getCartId()

  if (!cartId) {
    return
  }

  const headers = await getAuthHeaders()

  try {
    await sdk.store.cart.transferCart(cartId, {}, headers)
  } catch (error: any) {
    const recovered = await recoverFailedCartTransfer(cartId, headers, error)

    if (!recovered) {
      throw error
    }
  }

  const cartCacheTag = await getCacheTag("carts")
  revalidateTag(cartCacheTag)
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
