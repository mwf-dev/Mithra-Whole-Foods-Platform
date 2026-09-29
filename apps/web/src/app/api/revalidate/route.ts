import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

// Called server-to-server by the Medusa backend after admin saves
// (see apps/backend/src/api/admin/homepage/route.ts and
// src/subscribers/catalog-changed.ts). Requires the shared REVALIDATE_SECRET —
// this endpoint can purge any route's cache, so it must never be publicly
// callable.
//
// Accepts `{ tags: [...] }`, `{ path, type }`, or both. Prefer tags for catalog
// data: `revalidatePath("/", "layout")` does not reliably reach a fetch made
// inside a dynamic nested route such as /[countryCode]/(main)/products/[handle],
// which is how an edited product could keep serving its old images from the
// listing's sibling cache entry. `revalidateTag("products")` purges every
// catalog entry regardless of which URL produced it.
const MAX_TAGS = 20;

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
    const { path, type, tags } = await request.json();

    const hasTags = Array.isArray(tags) && tags.length > 0;
    const hasPath = typeof path === "string" && path.length > 0;

    if (!hasTags && !hasPath) {
      return NextResponse.json(
        { message: "Provide a path or tags to revalidate" },
        { status: 400 }
      );
    }

    const revalidatedTags: string[] = [];

    if (hasTags) {
      const clean = tags.filter(
        (t: unknown): t is string => typeof t === "string" && t.length > 0
      );

      if (clean.length !== tags.length) {
        return NextResponse.json(
          { message: "Tags must be non-empty strings" },
          { status: 400 }
        );
      }

      if (clean.length > MAX_TAGS) {
        return NextResponse.json(
          { message: `At most ${MAX_TAGS} tags per request` },
          { status: 400 }
        );
      }

      for (const tag of clean) {
        revalidateTag(tag);
        revalidatedTags.push(tag);
      }
    }

    if (hasPath) {
      if (type === "layout" || type === "page") {
        revalidatePath(path, type);
      } else {
        revalidatePath(path);
      }
    }

    return NextResponse.json({
      revalidated: true,
      tags: revalidatedTags,
      path: hasPath ? path : null,
      now: Date.now(),
    });
  } catch (err) {
    return NextResponse.json({ message: "Error revalidating" }, { status: 500 });
  }
}
