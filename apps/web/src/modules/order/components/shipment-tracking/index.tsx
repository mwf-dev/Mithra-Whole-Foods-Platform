import type { TrackedFulfillment } from "@lib/data/orders"

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

/**
 * One block per shipment: the carrier link (courier) or a hand-delivery note
 * (manual), then every status we have recorded, newest last.
 */
export default function ShipmentTracking({ fulfillments }: { fulfillments: TrackedFulfillment[] }) {
  if (!fulfillments.length) return null
  return (
    <div className="flex flex-col gap-4" data-testid="shipment-tracking">
      {fulfillments.map((f, i) => (
        <div key={i} className="rounded-xl border border-gray-200 p-4">
          <p className="font-medium">
            {fulfillments.length > 1 ? `Shipment ${i + 1}` : "Shipment"}
            {f.delivery_method === "manual" && (
              <span className="ml-2 text-sm font-normal text-gray-500">Delivered by our team</span>
            )}
          </p>
          {f.tracking.map((t) => (
            <p key={t.number} className="mt-1 text-sm">
              Tracking:{" "}
              {t.url ? (
                <a href={t.url} target="_blank" rel="noopener noreferrer" className="underline">
                  {t.number}
                </a>
              ) : (
                t.number
              )}
            </p>
          ))}
          {f.events.length > 0 && (
            <ol className="mt-3 space-y-2">
              {f.events.map((e, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm">
                  <span
                    className={`h-3 w-3 rounded-full ${
                      e.status === "exception" ? "bg-rose-500" : "bg-[#2E7D32]"
                    }`}
                  />
                  <span className="font-medium">{e.label}</span>
                  <span className="text-gray-500">{fmt(e.at)}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      ))}
    </div>
  )
}
