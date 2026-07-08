import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Called server-to-server by the Medusa backend after admin saves
// (see apps/backend/src/api/admin/homepage/route.ts). Requires the shared
// REVALIDATE_SECRET — this endpoint can purge any route's cache, so it
// must never be publicly callable.
export async function POST(request: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;

  if (!secret) {
    return NextResponse.json(
      { message: "Revalidation is not configured" },
      { status: 503 }
    );
  }

  if (request.headers.get("x-revalidate-secret") !== secret) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  try {
    const { path, type } = await request.json();

    if (!path || typeof path !== "string") {
      return NextResponse.json(
        { message: "Missing path to revalidate" },
        { status: 400 }
      );
    }

    if (type === "layout" || type === "page") {
      revalidatePath(path, type);
    } else {
      revalidatePath(path);
    }

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (err) {
    return NextResponse.json({ message: "Error revalidating" }, { status: 500 });
  }
}
