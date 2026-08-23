import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import {
  ALLOWED_UPLOAD_MIME,
  MAX_UPLOAD_BYTES,
} from "../../../lib/content-studio"
import { guard, noStore } from "../_shared"

/**
 * POST /content-studio/uploads?t=
 * { filename, mimeType, data: <base64>, handle?: string }
 *
 * Goes through Medusa's file module, so it lands wherever uploads already land
 * — Cloudinary in production, ./static in local dev — with no second set of
 * credentials to manage. JSON + base64 rather than multipart because the whole
 * studio is one static HTML page with no build step; a FileReader and a fetch
 * is the entire client side.
 *
 * The type/size checks are the real security boundary here: this route is
 * link-authenticated only, so it must never become an open file host. Only
 * still images and PDFs, never SVG (script-bearing), never video.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  if (!guard(req, res)) return
  noStore(res)

  const body = (req.body ?? {}) as Record<string, unknown>
  const filename = typeof body.filename === "string" ? body.filename.slice(0, 200) : ""
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.toLowerCase() : ""
  const data = typeof body.data === "string" ? body.data : ""
  const handle = typeof body.handle === "string" ? body.handle.slice(0, 80) : "product"

  if (!filename || !data) {
    res.status(400).json({ message: "filename and data are required." })
    return
  }

  if (!ALLOWED_UPLOAD_MIME.has(mimeType)) {
    res.status(415).json({
      message: "Only JPG, PNG, WEBP, GIF, AVIF, HEIC images or PDFs can be uploaded.",
    })
    return
  }

  const base64 = data.includes(",") ? data.slice(data.indexOf(",") + 1) : data
  let buffer: Buffer
  try {
    buffer = Buffer.from(base64, "base64")
  } catch {
    res.status(400).json({ message: "File data could not be read." })
    return
  }

  if (!buffer.length) {
    res.status(400).json({ message: "File is empty." })
    return
  }
  if (buffer.length > MAX_UPLOAD_BYTES) {
    res.status(413).json({
      message: `File is too large (max ${Math.round(MAX_UPLOAD_BYTES / (1024 * 1024))} MB).`,
    })
    return
  }

  const safeHandle = handle.replace(/[^a-z0-9-]/gi, "-").toLowerCase() || "product"
  const safeName = filename.replace(/[^a-zA-Z0-9.\-_]/g, "-")

  try {
    const fileService: any = req.scope.resolve(Modules.FILE)
    const created = await fileService.createFiles([
      {
        filename: `brief-${safeHandle}-${safeName}`,
        mimeType,
        content: buffer.toString("base64"),
        access: "public",
      },
    ])

    const file = Array.isArray(created) ? created[0] : created
    if (!file?.url) throw new Error("File provider returned no URL")

    res.json({ url: file.url, key: file.id ?? file.key ?? "", filename })
  } catch (error: any) {
    console.error("[content-studio] upload failed", error)
    res.status(500).json({ message: "Upload failed. Please try again." })
  }
}
