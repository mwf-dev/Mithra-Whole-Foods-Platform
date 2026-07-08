import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const { path, type } = await request.json();

    if (!path) {
      return NextResponse.json(
        { message: "Missing path to revalidate" }, 
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Revalidate the specified path (e.g. "/")
    if (type === "layout" || type === "page") {
      revalidatePath(path, type as 'layout' | 'page');
    } else {
      revalidatePath(path);
    }

    return NextResponse.json(
      { revalidated: true, now: Date.now() },
      { headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  } catch (err) {
    return NextResponse.json(
      { message: "Error revalidating" }, 
      { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}
