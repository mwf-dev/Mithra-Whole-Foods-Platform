import { NextRequest, NextResponse } from "next/server"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const publishableKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  try {
    const response = await fetch(`${backendUrl}/store/orders/${id}/invoice`, {
      method: "GET",
      headers: {
        "x-publishable-api-key": publishableKey,
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Medusa backend error:", errorText)
      return NextResponse.json(
        { error: "Failed to fetch invoice", details: errorText },
        { status: response.status }
      )
    }

    // Stream the PDF response back to the client
    const headers = new Headers()
    headers.set("Content-Type", "application/pdf")
    headers.set(
      "Content-Disposition",
      response.headers.get("Content-Disposition") || `attachment; filename="invoice-${id}.pdf"`
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
