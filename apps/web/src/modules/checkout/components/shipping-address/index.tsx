import { HttpTypes } from "@medusajs/types"
import { Container } from "@medusajs/ui"
import Checkbox from "@modules/common/components/checkbox"
import Input from "@modules/common/components/input"
import { mapKeys } from "lodash"
import React, { useEffect, useMemo, useState } from "react"
import AddressSelect from "../address-select"
import CountrySelect from "../country-select"
import AddressAutofill from "./address-autofill"
import { ResolvedAddress, lookupUsZip } from "@lib/util/address-lookup"

const ShippingAddress = ({
  customer,
  cart,
  checked,
  onChange,
}: {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  checked: boolean
  onChange: () => void
}) => {
  const [saveAddress, setSaveAddress] = useState(true)

  const [formData, setFormData] = useState<Record<string, any>>({
    "shipping_address.first_name": cart?.shipping_address?.first_name || "",
    "shipping_address.last_name": cart?.shipping_address?.last_name || "",
    "shipping_address.address_1": cart?.shipping_address?.address_1 || "",
    "shipping_address.company": cart?.shipping_address?.company || "",
    "shipping_address.postal_code": cart?.shipping_address?.postal_code || "",
    "shipping_address.city": cart?.shipping_address?.city || "",
    "shipping_address.country_code": cart?.shipping_address?.country_code || "",
    "shipping_address.province": cart?.shipping_address?.province || "",
    "shipping_address.phone": cart?.shipping_address?.phone || "",
    email: cart?.email || "",
  })

  const countriesInRegion = useMemo(
    () => cart?.region?.countries?.map((c) => c.iso_2),
    [cart?.region]
  )

  // check if customer has saved addresses that are in the current region
  const addressesInRegion = useMemo(
    () =>
      customer?.addresses.filter(
        (a) => a.country_code && countriesInRegion?.includes(a.country_code)
      ),
    [customer?.addresses, countriesInRegion]
  )

  const setFormAddress = (
    address?: HttpTypes.StoreCartAddress,
    email?: string
  ) => {
    address &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        "shipping_address.first_name": address?.first_name || "",
        "shipping_address.last_name": address?.last_name || "",
        "shipping_address.address_1": address?.address_1 || "",
        "shipping_address.company": address?.company || "",
        "shipping_address.postal_code": address?.postal_code || "",
        "shipping_address.city": address?.city || "",
        "shipping_address.country_code": address?.country_code || "",
        "shipping_address.province": address?.province || "",
        "shipping_address.phone": address?.phone || "",
      }))

    email &&
      setFormData((prevState: Record<string, any>) => ({
        ...prevState,
        email: email,
      }))
  }

  useEffect(() => {
    if (!cart) return

    // Prefer the customer's default saved address, else the first one valid in
    // this region.
    const savedAddress =
      addressesInRegion?.find((a) => a.is_default_shipping) ||
      addressesInRegion?.[0]

    const cartAddr = cart.shipping_address

    // Fill each field from the first source that actually has a value:
    //   cart address → saved account address → account identity.
    // Merging field-by-field means an EMPTY cart address (Medusa often creates
    // one) can't blank out what we already know about the customer.
    const pick = (...vals: (string | null | undefined)[]) =>
      vals.find((v) => v) || ""

    setFormData((prevState) => ({
      ...prevState,
      "shipping_address.first_name": pick(
        cartAddr?.first_name,
        savedAddress?.first_name,
        customer?.first_name
      ),
      "shipping_address.last_name": pick(
        cartAddr?.last_name,
        savedAddress?.last_name,
        customer?.last_name
      ),
      "shipping_address.address_1": pick(
        cartAddr?.address_1,
        savedAddress?.address_1
      ),
      "shipping_address.company": pick(cartAddr?.company, savedAddress?.company),
      "shipping_address.postal_code": pick(
        cartAddr?.postal_code,
        savedAddress?.postal_code
      ),
      "shipping_address.city": pick(cartAddr?.city, savedAddress?.city),
      "shipping_address.country_code": pick(
        cartAddr?.country_code,
        savedAddress?.country_code
      ),
      "shipping_address.province": pick(
        cartAddr?.province,
        savedAddress?.province
      ),
      "shipping_address.phone": pick(
        cartAddr?.phone,
        savedAddress?.phone,
        customer?.phone
      ),
      email: pick(cart.email, customer?.email),
    }))
  }, [cart, customer, addressesInRegion])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLInputElement | HTMLSelectElement
    >
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })

    // ZIP -> city/state autofill (keyless). Only fills fields the user hasn't
    // already typed, so we never clobber manual edits.
    if (e.target.name === "shipping_address.postal_code") {
      const zip = e.target.value
      if (/^\d{5}$/.test(zip)) {
        lookupUsZip(zip).then((res) => {
          if (!res) return
          setFormData((prev) => ({
            ...prev,
            "shipping_address.city": prev["shipping_address.city"] || res.city,
            "shipping_address.province":
              prev["shipping_address.province"] || res.state,
            "shipping_address.country_code":
              prev["shipping_address.country_code"] || "us",
          }))
        })
      }
    }
  }

  // Merge a resolved address (from autocomplete or geolocation) into the form.
  const applyResolved = (address: ResolvedAddress) => {
    setFormData((prev) => ({
      ...prev,
      "shipping_address.address_1":
        address.address_1 || prev["shipping_address.address_1"],
      "shipping_address.city": address.city || prev["shipping_address.city"],
      "shipping_address.province":
        address.province || prev["shipping_address.province"],
      "shipping_address.postal_code":
        address.postal_code || prev["shipping_address.postal_code"],
      "shipping_address.country_code":
        address.country_code || prev["shipping_address.country_code"],
    }))
  }

  return (
    <>
      <AddressAutofill onResolved={applyResolved} />
      {customer && (addressesInRegion?.length || 0) > 0 && (
        <Container className="mb-6 flex flex-col gap-y-4 p-5">
          <p className="text-small-regular">
            {`Hi ${customer.first_name}, do you want to use one of your saved addresses?`}
          </p>
          <AddressSelect
            addresses={customer.addresses}
            addressInput={
              mapKeys(formData, (_, key) =>
                key.replace("shipping_address.", "")
              ) as HttpTypes.StoreCartAddress
            }
            onSelect={setFormAddress}
          />
        </Container>
      )}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="First name"
          name="shipping_address.first_name"
          autoComplete="given-name"
          value={formData["shipping_address.first_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-first-name-input"
        />
        <Input
          label="Last name"
          name="shipping_address.last_name"
          autoComplete="family-name"
          value={formData["shipping_address.last_name"]}
          onChange={handleChange}
          required
          data-testid="shipping-last-name-input"
        />
        <Input
          label="Address"
          name="shipping_address.address_1"
          autoComplete="address-line1"
          value={formData["shipping_address.address_1"]}
          onChange={handleChange}
          required
          data-testid="shipping-address-input"
        />
        <Input
          label="Company"
          name="shipping_address.company"
          value={formData["shipping_address.company"]}
          onChange={handleChange}
          autoComplete="organization"
          data-testid="shipping-company-input"
        />
        <Input
          label="Postal code"
          name="shipping_address.postal_code"
          autoComplete="postal-code"
          value={formData["shipping_address.postal_code"]}
          onChange={handleChange}
          required
          data-testid="shipping-postal-code-input"
        />
        <Input
          label="City"
          name="shipping_address.city"
          autoComplete="address-level2"
          value={formData["shipping_address.city"]}
          onChange={handleChange}
          required
          data-testid="shipping-city-input"
        />
        <CountrySelect
          name="shipping_address.country_code"
          autoComplete="country"
          region={cart?.region}
          value={formData["shipping_address.country_code"]}
          onChange={handleChange}
          required
          data-testid="shipping-country-select"
        />
        <Input
          label="State / Province"
          name="shipping_address.province"
          autoComplete="address-level1"
          value={formData["shipping_address.province"]}
          onChange={handleChange}
          data-testid="shipping-province-input"
        />
      </div>
      <div className="my-8">
        <Checkbox
          label="Billing address same as shipping address"
          name="same_as_billing"
          checked={checked}
          onChange={onChange}
          data-testid="billing-address-checkbox"
        />
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <Input
          label="Email"
          name="email"
          type="email"
          title="Enter a valid email address."
          autoComplete="email"
          value={formData.email}
          onChange={handleChange}
          required
          data-testid="shipping-email-input"
        />
        <Input
          label="Phone"
          name="shipping_address.phone"
          autoComplete="tel"
          value={formData["shipping_address.phone"]}
          onChange={handleChange}
          data-testid="shipping-phone-input"
        />
      </div>
      {customer && (addressesInRegion?.length || 0) === 0 && (
        <div className="mb-4">
          <Checkbox
            label="Save this delivery address to my account"
            name="save_address"
            checked={saveAddress}
            onChange={() => setSaveAddress((prev) => !prev)}
            data-testid="save-address-checkbox"
          />
        </div>
      )}
    </>
  )
}

export default ShippingAddress
