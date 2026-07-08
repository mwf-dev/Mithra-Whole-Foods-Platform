/**
 * Sanitizes a URL for interpolation into a CSS `url('...')` declaration.
 *
 * Values reaching this come from CMS/admin-managed content (hero image,
 * product thumbnails). Strips characters that could break out of the CSS
 * string and rejects anything that isn't http(s), root-relative, or a data
 * image URI. Returns "" when the value is unsafe.
 */
export function safeCssUrl(url: string | null | undefined): string {
  if (!url) {
    return ""
  }

  const cleaned = url.replace(/['"()\\;\s]/g, "")

  if (
    cleaned.startsWith("/") ||
    cleaned.startsWith("http://") ||
    cleaned.startsWith("https://") ||
    cleaned.startsWith("data:image/")
  ) {
    return cleaned
  }

  return ""
}
