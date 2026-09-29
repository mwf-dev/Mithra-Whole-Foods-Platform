import { Metadata } from "next"

import Overview from "@modules/account/components/overview"
import { notFound } from "next/navigation"
import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"

export const metadata: Metadata = {
  title: "Account",
  description: "Overview of your account activity.",
}

export default async function OverviewTemplate() {
  const customer = await retrieveCustomer().catch(() => null)

  // Next renders both `@dashboard` and `@login` slots for /account and lets the
  // layout pick one, so this runs for signed-out visitors too. Bail before
  // touching /store/orders — unauthenticated it can only 401, which spams the
  // console and spends a request against the store API's rate limit.
  if (!customer) {
    notFound()
  }

  const orders = (await listOrders().catch(() => null)) || null

  return <Overview customer={customer} orders={orders} />
}
