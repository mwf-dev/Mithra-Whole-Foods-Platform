import { Metadata } from "next"
import TrackForm from "@modules/order/components/track-form"

export const metadata: Metadata = {
  title: "Track your order",
  description: "Check where your Mithra Whole Foods order is, using your order number and phone.",
}

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order = "" } = await searchParams
  return (
    <div className="content-container flex flex-col items-center py-12">
      <h1 className="text-large-semi uppercase mb-2">Track your order</h1>
      <p className="mb-8 max-w-md text-center text-base-regular">
        Enter your order number and the phone number you used at checkout. No account needed.
      </p>
      <TrackForm initialOrder={order.slice(0, 40)} />
    </div>
  )
}
