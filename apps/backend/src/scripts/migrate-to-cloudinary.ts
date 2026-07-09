/**
 * migrate-to-cloudinary.ts
 *
 * Uploads every localhost:9000/static/* image to Cloudinary,
 * then updates the `image` table in Neon so all URLs point to Cloudinary.
 *
 * Usage:
 *   cd apps/backend
 *   pnpm exec ts-node -e "require('./src/scripts/migrate-to-cloudinary.ts')"
 *
 * Or run the compiled JS version via the npm script we'll add.
 *
 * Prerequisites:
 *   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env
 *   DATABASE_URL in .env
 *   Images physically present in ./static/ folder
 */

import * as fs from "fs"
import * as path from "path"
import { Client } from "pg"
import { v2 as cloudinary } from "cloudinary"
import { loadEnv } from "@medusajs/framework/utils"

// Load .env from the backend root
loadEnv(process.env.NODE_ENV || "development", process.cwd())

// ─── Config ─────────────────────────────────────────────────────────────────
const CLOUDINARY_FOLDER = "mithra-wholefoods"
const STATIC_DIR = path.join(process.cwd(), "static")
const LOCALHOST_PREFIX = "http://localhost:9000/static/"
const DRY_RUN = process.argv.includes("--dry-run")

// ─── Cloudinary setup ────────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

// ─── Helpers ─────────────────────────────────────────────────────────────────
function urlToFilename(url: string): string {
  const encoded = url.replace(LOCALHOST_PREFIX, "")
  return decodeURIComponent(encoded)
}

async function uploadToCloudinary(
  filePath: string,
  publicId: string
): Promise<string> {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: CLOUDINARY_FOLDER,
    public_id: publicId,
    overwrite: false,       // skip if already uploaded
    resource_type: "image",
    use_filename: true,
    unique_filename: false,
  })
  return result.secure_url
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n🌩️  Mithra Whole Foods — Cloudinary Migration`)
  console.log(`   DRY_RUN: ${DRY_RUN}`)
  console.log(`   Static dir: ${STATIC_DIR}\n`)

  // Validate env
  if (
    !process.env.CLOUDINARY_CLOUD_NAME ||
    !process.env.CLOUDINARY_API_KEY ||
    !process.env.CLOUDINARY_API_SECRET
  ) {
    console.error("❌ Missing CLOUDINARY_* env vars. Check your .env file.")
    process.exit(1)
  }
  if (!process.env.DATABASE_URL) {
    console.error("❌ Missing DATABASE_URL in .env.")
    process.exit(1)
  }

  // Connect to Neon
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  await db.connect()
  console.log("✅ Connected to Neon database")

  // Fetch all localhost image rows
  const { rows } = await db.query<{ id: string; url: string }>(
    `SELECT id, url FROM image WHERE url LIKE $1 ORDER BY created_at ASC`,
    [`${LOCALHOST_PREFIX}%`]
  )
  console.log(`📷 Found ${rows.length} images to migrate\n`)

  if (rows.length === 0) {
    console.log("✅ Nothing to migrate — all images already on Cloudinary.")
    await db.end()
    return
  }

  let success = 0
  let skipped = 0
  let failed = 0

  for (const row of rows) {
    const filename = urlToFilename(row.url)
    const filePath = path.join(STATIC_DIR, filename)
    const publicId = path.parse(filename).name // filename without extension

    // Check file exists locally
    if (!fs.existsSync(filePath)) {
      console.warn(`  ⚠️  File not found locally: ${filename} — skipping`)
      skipped++
      continue
    }

    console.log(`  ⬆️  Uploading: ${filename}`)

    if (DRY_RUN) {
      console.log(`     [DRY RUN] Would upload to ${CLOUDINARY_FOLDER}/${publicId}`)
      success++
      continue
    }

    try {
      const cloudinaryUrl = await uploadToCloudinary(filePath, publicId)
      console.log(`     ✅ ${cloudinaryUrl}`)

      // Update DB row
      await db.query(`UPDATE image SET url = $1 WHERE id = $2`, [
        cloudinaryUrl,
        row.id,
      ])
      success++
    } catch (err: any) {
      console.error(`     ❌ Failed: ${err.message || err}`)
      failed++
    }
  }

  await db.end()

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`✅ Migrated : ${success}`)
  console.log(`⚠️  Skipped  : ${skipped}`)
  console.log(`❌ Failed   : ${failed}`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error("Fatal error:", err)
  process.exit(1)
})
