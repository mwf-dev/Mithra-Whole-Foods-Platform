/**
 * Validates a `?redirect=` value before it is handed to `redirect()`.
 *
 * Sign-in and sign-up bounce the shopper back to wherever they came from
 * (checkout, a product page, the wishlist), which means an attacker-supplied
 * string reaches `redirect()`. A `startsWith("/")` test is not enough on its
 * own: `//evil.com` and `/\evil.com` both start with a slash and are read by
 * browsers as *protocol-relative absolute URLs*, so they navigate off-site.
 * That turns our own sign-in page into a credible phishing hop — the victim
 * really did just authenticate on the real domain before being handed to the
 * lookalike.
 *
 * Returns the path when it is unambiguously internal, otherwise null so the
 * caller can fall back to a known-safe destination.
 */
export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  // Browsers *delete* tabs and newlines while resolving a URL, so
  // "/<tab>/evil.com" would survive a naive check and then be read as
  // "//evil.com". Drop every control character before deciding anything, and
  // trim the ends so a leading space can't hide a "//" either.
  //
  // Interior spaces are deliberately kept: browsers percent-encode those
  // rather than removing them, so stripping them here would quietly corrupt
  // legitimate destinations like "/us/store?q=basmati rice".
  const path = Array.from(value)
    .filter((char) => {
      const code = char.charCodeAt(0)
      return code >= 0x20 && code !== 0x7f
    })
    .join("")
    .trim()

  if (!path.startsWith("/")) {
    return null
  }

  // The protocol-relative forms. A backslash counts: browsers normalise it to
  // a forward slash in this position.
  if (path.length > 1 && (path[1] === "/" || path[1] === "\\")) {
    return null
  }

  return path
}
