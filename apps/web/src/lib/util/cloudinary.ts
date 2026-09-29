/**
 * Injects delivery transformations into a Cloudinary URL.
 *
 * The homepage CMS stores whatever URL the admin upload returned, which is the
 * *original* asset — the offer/promo/category tiles were shipping 2.1–2.3 MB
 * PNGs each, ~20 MB for one homepage. Those tiles are painted as CSS
 * `background-image`, so `next/image` never sees them and none of the
 * optimisation configured in `next.config.js` applies. Cloudinary can do the
 * same job at the CDN edge, which is why the fix lives here and not in the
 * components.
 *
 * `f_auto` negotiates AVIF/WebP from the Accept header, `q_auto` picks a
 * perceptual quality target, and `w_*`/`dpr_auto` cap the delivered pixels to
 * what the tile actually paints. Measured on the live assets: 2,314 KB → 61 KB.
 *
 * Anything that is not a Cloudinary delivery URL is returned untouched — local
 * `static/` uploads, data URIs and third-party images must keep working.
 * A URL that already carries transformations is also left alone, so an admin
 * who hand-tunes one is not overridden.
 */

/** Matches the `/image/upload/` delivery segment every Cloudinary URL has. */
const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.*)$/

/**
 * Cloudinary reads the segment after `/upload/` as transformations when it
 * looks like `key_value` pairs. A version (`v123…`) or a bare folder does not,
 * which is how we tell "already transformed" from "original".
 */
const HAS_TRANSFORMS = /^[a-z]{1,3}_[^/]+\//

export type CloudinaryOptions = {
  /** Max rendered width in CSS pixels. `dpr_auto` handles retina on top. */
  width?: number
  /** Omit to let Cloudinary choose; pass a number only to force quality. */
  quality?: number | "auto"
}

export function cloudinaryUrl(
  url: string | null | undefined,
  { width, quality = "auto" }: CloudinaryOptions = {}
): string {
  if (!url) {
    return ""
  }

  const match = url.match(CLOUDINARY_UPLOAD)

  if (!match) {
    return url
  }

  const [, prefix, rest] = match

  if (HAS_TRANSFORMS.test(rest)) {
    return url
  }

  const transforms = ["f_auto", `q_${quality}`, "dpr_auto"]

  if (width) {
    // `c_limit` never upscales, so a smaller original is served as-is rather
    // than being blown up and re-encoded.
    transforms.push(`w_${width}`, "c_limit")
  }

  return `${prefix}${transforms.join(",")}/${rest}`
}
