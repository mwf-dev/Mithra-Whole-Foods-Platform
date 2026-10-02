import type { AisleWorld } from "@modules/home/aisles"

/**
 * Flat illustrations for the "Shop by aisle" discs — one per aisle, drawn
 * here as inline SVG (no requests, crisp at any size, recoloured per aisle).
 * The client asked for illustrations rather than product photos for
 * categories, in the spirit of the Two Brothers icon row.
 *
 * Colour rule: on a dark disc the drawing is cream with deep-colour details;
 * on a light disc it flips to deep-colour with cream details. Either way it
 * reads against the disc without new colours.
 */

const CREAM = "#FFF6E6"

type Ink = { body: string; detail: string }
type Draw = (ink: Ink) => React.ReactNode

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function inkFor(world: AisleWorld): Ink {
  return luminance(world.bg) < 0.25
    ? { body: CREAM, detail: world.deep }
    : { body: world.deep, detail: CREAM }
}

const ILLUSTRATIONS: Record<string, Draw> = {
  // Ghee: a squat jar with a golden drop above it.
  ghee: ({ body, detail }) => (
    <>
      <path d="M50 8c5 7 9 12 9 17a9 9 0 0 1-18 0c0-5 4-10 9-17z" fill={body} />
      <rect x="29" y="34" width="42" height="9" rx="3" fill={body} />
      <rect x="25" y="42" width="50" height="46" rx="10" fill={body} />
      <rect x="25" y="54" width="50" height="18" fill={detail} />
      <path d="M38 63h24" stroke={body} strokeWidth="3" strokeLinecap="round" />
      <path d="M32 78h8" stroke={detail} strokeWidth="3" strokeLinecap="round" opacity=".6" />
    </>
  ),

  // Podis & spices: mortar and pestle with a chilli.
  podis: ({ body, detail }) => (
    <>
      <rect x="54" y="14" width="10" height="40" rx="5" transform="rotate(32 59 34)" fill={body} />
      <path d="M18 50h64c0 15-14 28-32 28S18 65 18 50z" fill={body} />
      <rect x="36" y="76" width="28" height="8" rx="3" fill={body} />
      <path d="M26 56c8 4 40 4 48 0" stroke={detail} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M24 30c6-2 14 0 18 8 1 2-1 3-3 2-5-4-10-5-15-5-2 0-3-4 0-5z" fill={body} />
      <path d="M24 30c-2-3-1-6 2-7" stroke={body} strokeWidth="3" strokeLinecap="round" fill="none" />
    </>
  ),

  // Kids' flours: a porridge bowl with a spoon and steam.
  "kids-flours": ({ body, detail }) => (
    <>
      <path d="M38 14c-4 5 4 8 0 14M50 10c-4 5 4 8 0 14M62 14c-4 5 4 8 0 14" stroke={body} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M16 46h68c0 18-15 32-34 32S16 64 16 46z" fill={body} />
      <ellipse cx="50" cy="46" rx="34" ry="7" fill={detail} />
      <rect x="40" y="76" width="20" height="8" rx="3" fill={body} />
      <path d="M60 44l20-20" stroke={body} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="57" cy="47" rx="7" ry="4" fill={body} />
      <circle cx="34" cy="62" r="3" fill={detail} />
      <circle cx="44" cy="66" r="3" fill={detail} />
    </>
  ),

  // Health mixes: a mug with steam and grains.
  "health-mixes": ({ body, detail }) => (
    <>
      <path d="M36 12c-4 5 4 8 0 14M48 8c-4 5 4 8 0 14" stroke={body} strokeWidth="3" strokeLinecap="round" fill="none" />
      <path d="M20 32h48v34a16 16 0 0 1-16 16H36a16 16 0 0 1-16-16z" fill={body} />
      <path d="M68 40h6a10 10 0 0 1 0 20h-6" stroke={body} strokeWidth="6" fill="none" />
      <rect x="20" y="32" width="48" height="8" fill={detail} />
      <path d="M44 52c4-6 10-6 10 0s-6 10-10 12c-4-2-10-6-10-12s6-6 10 0z" fill={detail} />
      <ellipse cx="80" cy="82" rx="4" ry="6" transform="rotate(30 80 82)" fill={body} />
      <ellipse cx="88" cy="74" rx="3.5" ry="5.5" transform="rotate(-20 88 74)" fill={body} />
    </>
  ),

  // Rice: a heaped bowl.
  rice: ({ body, detail }) => (
    <>
      <path d="M22 50c0-16 12-28 28-28s28 12 28 28z" fill={body} />
      {[
        [34, 40, -30], [44, 32, 20], [56, 34, -15], [66, 42, 35],
        [42, 44, 60], [54, 44, -50], [50, 38, 0],
      ].map(([x, y, r]) => (
        <ellipse key={`${x}-${y}`} cx={x} cy={y} rx="2" ry="4" transform={`rotate(${r} ${x} ${y})`} fill={detail} />
      ))}
      <path d="M14 50h72c0 18-16 32-36 32S14 68 14 50z" fill={body} />
      <path d="M22 58h56" stroke={detail} strokeWidth="3" strokeLinecap="round" />
      <rect x="38" y="80" width="24" height="7" rx="3" fill={body} />
    </>
  ),

  // Cold-pressed oils: a bottle, a drop and a sesame leaf.
  oils: ({ body, detail }) => (
    <>
      <rect x="40" y="10" width="16" height="9" rx="2" fill={body} />
      <path d="M42 19h12v10c8 4 12 10 12 18v34a6 6 0 0 1-6 6H36a6 6 0 0 1-6-6V47c0-8 4-14 12-18z" fill={body} />
      <rect x="30" y="52" width="36" height="20" fill={detail} />
      <path d="M48 56c3 4 5 7 5 9a5 5 0 0 1-10 0c0-2 2-5 5-9z" fill={body} />
      <path d="M74 50c8-6 16-4 18 0-4 8-12 10-18 0z" fill={body} />
      <path d="M74 50l14-2" stroke={detail} strokeWidth="2" strokeLinecap="round" />
    </>
  ),

  // Millets: a grain head on its stalk.
  millets: ({ body, detail }) => (
    <>
      <path d="M50 90V40" stroke={body} strokeWidth="4" strokeLinecap="round" />
      <path d="M50 70c-12-2-20-10-22-20 10 0 20 8 22 20zM50 62c10-4 18-12 18-22-10 2-18 10-18 22z" fill={body} />
      {[0, 1, 2, 3, 4].map((row) =>
        [-1, 1].map((side) => (
          <ellipse
            key={`${row}${side}`}
            cx={50 + side * 6}
            cy={14 + row * 7}
            rx="5"
            ry="4"
            fill={body}
          />
        ))
      )}
      <ellipse cx="50" cy="10" rx="5" ry="5" fill={body} />
      <path d="M50 12v30" stroke={detail} strokeWidth="2" strokeLinecap="round" opacity=".8" />
    </>
  ),

  // Natural sweeteners: jaggery blocks beside a stick of sugarcane.
  sweeteners: ({ body, detail }) => (
    <>
      <rect x="68" y="12" width="10" height="74" rx="4" fill={body} />
      {[30, 50, 70].map((y) => (
        <path key={y} d={`M66 ${y}h14`} stroke={detail} strokeWidth="3" strokeLinecap="round" />
      ))}
      <path d="M73 14c-6-6-14-6-18-2 6 2 12 4 18 2zM74 14c4-8 12-10 16-8-4 4-10 8-16 8z" fill={body} />
      <rect x="16" y="58" width="24" height="24" rx="5" fill={body} />
      <rect x="40" y="58" width="24" height="24" rx="5" fill={body} />
      <rect x="28" y="36" width="24" height="24" rx="5" fill={body} />
      <path d="M22 66h12M46 66h12M34 44h12" stroke={detail} strokeWidth="2.5" strokeLinecap="round" opacity=".7" />
    </>
  ),

  // Sweets & snacks: a stack of laddus on a plate.
  "sweets-snacks": ({ body, detail }) => (
    <>
      <ellipse cx="50" cy="80" rx="38" ry="8" fill={body} />
      <circle cx="35" cy="62" r="14" fill={body} />
      <circle cx="65" cy="62" r="14" fill={body} />
      <circle cx="50" cy="38" r="14" fill={body} />
      {[
        [31, 58], [38, 66], [61, 58], [68, 66], [46, 34], [54, 42], [52, 30],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.2" fill={detail} />
      ))}
      <path d="M18 80h64" stroke={detail} strokeWidth="2.5" strokeLinecap="round" opacity=".6" />
    </>
  ),

  // Traditional treats: a jangiri swirl on a plate.
  treats: ({ body, detail }) => (
    <>
      <ellipse cx="50" cy="78" rx="38" ry="9" fill={body} />
      <path d="M18 78h64" stroke={detail} strokeWidth="2.5" strokeLinecap="round" opacity=".6" />
      <path
        d="M50 50m-4 0a4 4 0 1 1 8 0a8 8 0 1 1-16 0a12 12 0 1 1 24 0a16 16 0 1 1-32 0a20 20 0 1 1 40 0"
        stroke={body}
        strokeWidth="5"
        strokeLinecap="round"
        fill="none"
      />
      {[
        [30, 34], [70, 34], [50, 26], [26, 54], [74, 54],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="3" fill={body} />
      ))}
    </>
  ),

  // Dals & pantry: an open sack of lentils with a scoop.
  pantry: ({ body, detail }) => (
    <>
      <path d="M24 34h52l4 46a6 6 0 0 1-6 6H26a6 6 0 0 1-6-6z" fill={body} />
      <path d="M22 34c4-6 10-8 14-4 4-6 12-6 14 0 4-6 12-6 14 0 4-4 10-2 14 4z" fill={body} />
      <ellipse cx="50" cy="36" rx="24" ry="5" fill={detail} />
      {[
        [40, 34], [48, 37], [56, 34], [62, 37], [34, 37],
      ].map(([x, y]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="2.4" fill={body} />
      ))}
      <path d="M36 56h28M36 64h20" stroke={detail} strokeWidth="3" strokeLinecap="round" />
      <path d="M70 18l12 -8" stroke={body} strokeWidth="5" strokeLinecap="round" />
      <path d="M58 22c4-8 14-10 18-4-2 8-12 10-18 4z" fill={body} />
    </>
  ),
}

export const hasIllustration = (id: string) => id in ILLUSTRATIONS

/** The aisle's illustration, or `null` if none is drawn for it. */
export function AisleIllustration({
  id,
  world,
  className,
}: {
  id: string
  world: AisleWorld
  className?: string
}) {
  const draw = ILLUSTRATIONS[id]
  if (!draw) return null
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden focusable="false">
      {draw(inkFor(world))}
    </svg>
  )
}
