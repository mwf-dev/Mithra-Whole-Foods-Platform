/**
 * migrate-to-cloudinary.ts
 *
 * Uploads every localhost:9000/static/* image to Cloudinary, then rewrites
 * ALL references in Neon: the `image` table, `product.thumbnail`, and the
 * homepage CMS row (`hero_image_url`, `promo_card_1_url`, `promo_card_2_url`,
 * `offer_cards` JSON).
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

// The local file provider sanitizes names on disk (spaces/parens → dashes)
// while DB URLs keep the original name. The ms-timestamp prefix is unique
// per upload, so fall back to matching on it.
function resolveStaticFile(filename: string): string | null {
  const exact = path.join(STATIC_DIR, filename)
  if (fs.existsSync(exact)) return exact
  const prefix = filename.split("-")[0] + "-"
  const matches = fs
    .readdirSync(STATIC_DIR)
    .filter((f) => f.startsWith(prefix))
  return matches.length === 1 ? path.join(STATIC_DIR, matches[0]) : null
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

  // Collect every distinct localhost URL across all tables that reference
  // uploaded files: image gallery rows, product thumbnails, homepage CMS.
  const { rows: imageRows } = await db.query<{ id: string; url: string }>(
    `SELECT id, url FROM image WHERE url LIKE $1 ORDER BY created_at ASC`,
    [`${LOCALHOST_PREFIX}%`]
  )
  const { rows: thumbRows } = await db.query<{ id: string; thumbnail: string }>(
    `SELECT id, thumbnail FROM product WHERE thumbnail LIKE $1`,
    [`${LOCALHOST_PREFIX}%`]
  )
  // Homepage CMS: scan the whole row — JSON columns (hero_banners,
  // offer_cards, category_tiles, …) can hold either absolute localhost URLs
  // or backend-relative "/static/…" paths (the storefront prefixes those
  // with MEDUSA_BACKEND_URL at render time, so they break in the cloud too).
  const { rows: homepageRows } = await db.query<Record<string, unknown>>(
    `SELECT * FROM homepage_setting`
  )

  const urlSet = new Set<string>()
  imageRows.forEach((r) => urlSet.add(r.url))
  thumbRows.forEach((r) => urlSet.add(r.thumbnail))
  const urlRegex = new RegExp(
    `${LOCALHOST_PREFIX.replace(/[/.:]/g, "\\$&")}[^"'\\s\\\\]+`,
    "g"
  )
  const relRegex = /\/static\/[^"'\s\\]+/g
  for (const hp of homepageRows) {
    const blob = JSON.stringify(hp)
    for (const m of blob.match(urlRegex) ?? []) urlSet.add(m)
    for (const m of blob.match(relRegex) ?? [])
      urlSet.add(LOCALHOST_PREFIX + m.slice("/static/".length))
  }

  const urls = [...urlSet]
  console.log(
    `📷 Found ${urls.length} distinct localhost URLs ` +
      `(${imageRows.length} image rows, ${thumbRows.length} product thumbnails, ` +
      `${homepageRows.length} homepage rows scanned)\n`
  )

  if (urls.length === 0) {
    console.log("✅ Nothing to migrate — all URLs already on Cloudinary.")
    await db.end()
    return
  }

  // Phase 1: upload each distinct file once, building oldUrl → newUrl map.
  const urlMap = new Map<string, string>()
  let success = 0
  let skipped = 0
  let failed = 0

  for (const url of urls) {
    const filename = urlToFilename(url)
    const filePath = resolveStaticFile(filename)
    // filename without extension, sanitized for a clean Cloudinary public_id
    const publicId = path
      .parse(filename)
      .name.replace(/[^a-zA-Z0-9_.-]+/g, "-")
      .replace(/-+/g, "-")

    if (!filePath) {
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
      urlMap.set(url, cloudinaryUrl)
      success++
    } catch (err: any) {
      console.error(`     ❌ Failed: ${err.message || err}`)
      failed++
    }
  }

  // Phase 2: rewrite DB references using the map (skipped in dry-run).
  if (!DRY_RUN) {
    let rewrites = 0
    for (const row of imageRows) {
      const next = urlMap.get(row.url)
      if (!next) continue
      await db.query(`UPDATE image SET url = $1 WHERE id = $2`, [next, row.id])
      rewrites++
    }
    for (const row of thumbRows) {
      const next = urlMap.get(row.thumbnail)
      if (!next) continue
      await db.query(`UPDATE product SET thumbnail = $1 WHERE id = $2`, [
        next,
        row.id,
      ])
      rewrites++
    }
    // Replace absolute localhost URLs first, then the backend-relative
    // "/static/…" form of the same file (JSON escapes "/" as-is, so plain
    // string replacement is safe on stringified JSON).
    const replaceAll = (s: string) => {
      let out = s
      for (const [oldUrl, newUrl] of urlMap) {
        out = out.split(oldUrl).join(newUrl)
        const rel = oldUrl.slice("http://localhost:9000".length)
        out = out.split(rel).join(newUrl)
      }
      return out
    }
    for (const hp of homepageRows) {
      const updates: string[] = []
      const values: unknown[] = []
      for (const [col, v] of Object.entries(hp)) {
        if (["id", "created_at", "updated_at", "deleted_at"].includes(col)) {
          continue
        }
        if (typeof v === "string") {
          const next = replaceAll(v)
          if (next !== v) {
            values.push(next)
            updates.push(`"${col}" = $${values.length}`)
          }
        } else if (v && typeof v === "object") {
          const json = JSON.stringify(v)
          const next = replaceAll(json)
          if (next !== json) {
            values.push(next)
            updates.push(`"${col}" = $${values.length}::jsonb`)
          }
        }
      }
      if (updates.length > 0) {
        values.push(hp.id)
        await db.query(
          `UPDATE homepage_setting SET ${updates.join(", ")} WHERE id = $${values.length}`,
          values
        )
        rewrites++
      }
    }
    console.log(`\n🔁 Rewrote ${rewrites} DB references`)
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
