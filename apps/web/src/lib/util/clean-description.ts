/**
 * Product descriptions imported from the old catalogue carry HTML entities
 * ("&nbsp;", "&amp;") and a trailing "Tags: …" block. Tidy them for display;
 * the stored value is left alone.
 */
const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&lt;": "<",
  "&gt;": ">",
}

export function cleanDescription(raw?: string | null): string {
  if (!raw) return ""
  let text = raw.replace(/&(nbsp|amp|quot|apos|lt|gt|#39);/g, (m) => ENTITIES[m] ?? m)
  // Drop the legacy "Tags:" block and everything after it.
  text = text.replace(/\n?\s*Tags:[\s\S]*$/i, "")
  return text
    .split(/\n+/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ")
}
