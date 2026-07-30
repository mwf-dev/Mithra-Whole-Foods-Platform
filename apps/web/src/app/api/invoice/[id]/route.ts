import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

/**
 * Streams an order's invoice PDF from the Medusa backend.
 *
 * This exists so the browser never talks to the backend directly (it would
 * need the publishable key, and the auth token lives in an httpOnly cookie
 * scoped to this origin). Because the backend now enforces that the caller
 * owns the order, this proxy *must* forward that token — without it every
 * request arrives anonymous and the download 401s.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  // `MEDUSA_BACKEND_URL`, not `NEXT_PUBLIC_MEDUSA_BACKEND_URL`: the variable
  // was renamed repo-wide and this route was the last straggler still reading
  // the old name. Nothing sets it, so this silently fell back to localhost —
  // which works on a dev machine and fails in production.
  const backendUrl = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  const token = (await cookies()).get("_medusa_jwt")?.value

  if (!token) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  try {
    const response = await fetch(`${backendUrl}/store/orders/${id}/invoice`, {
      method: "GET",
      headers: {
        "x-publishable-api-key": publishableKey,
        authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      // The backend's reason stays in our logs. Passing its body through would
      // tell someone probing order ids more than the status code already does.
      const detail = await response.text()
      console.error(
        `Invoice fetch failed for ${id}: ${response.status} ${detail}`
      )
      return NextResponse.json(
        { error: "Failed to fetch invoice" },
        { status: response.status }
      )
    }

    // Stream the PDF response back to the client
    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set(
      "Content-Disposition",
      response.headers.get("Content-Disposition") ||
        `attachment; filename="invoice-${id}.pdf"`
    )

    return new NextResponse(response.body, {
      status: 200,
      headers,
    })
  } catch (error) {
    console.error("Invoice proxy error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
