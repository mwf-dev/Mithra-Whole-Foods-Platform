import { TICKER_FACTS } from "@modules/home/aisles"

/**
 * Admin-managed announcement strip above the header, run as a slow ticker.
 *
 * The admin text is split on `·` or `|` so "Free delivery over $49 · COD
 * available" becomes two items; a few fixed brand facts follow. The track is
 * rendered twice and translated by -50%, which makes the loop seamless. It
 * pauses on hover and stands still for reduced-motion visitors. Screen readers
 * get the plain list once (the duplicate is aria-hidden). Hidden when empty.
 */
export function AnnouncementBar({ text }: { text?: string | null }) {
  if (!text) {
    return null
  }

  const items = [
    ...text
      .split(/\s[·|]\s/)
      .map((t) => t.trim())
      .filter(Boolean),
    ...TICKER_FACTS,
  ]
  // Each half of the loop must be wider than the widest screen, or a gap
  // shows before the second copy arrives. Five short items are ~1000px.
  const loop = [...items, ...items]

  const track = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center"
    >
      {loop.map((item, i) => (
        <li key={i} className="flex items-center whitespace-nowrap">
          <span className="px-6">{item}</span>
          <span aria-hidden className="text-white/40">
            ✦
          </span>
        </li>
      ))}
    </ul>
  )

  return (
    <div className="overflow-hidden bg-primary-dark text-white text-[11px] md:text-xs font-medium uppercase tracking-[0.08em] py-2">
      <div className="mithra-marquee flex w-max">
        {track(false)}
        {track(true)}
      </div>
    </div>
  )
}
