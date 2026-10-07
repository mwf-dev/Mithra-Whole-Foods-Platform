/**
 * Line-and-leaf illustrations for the edges of homepage sections: a millet
 * stalk, a curry-leaf branch and a lotus kolam. Pure SVG in `currentColor`, so
 * a section tints them (usually the brand green at low opacity) and they stay
 * crisp at any size. Decorative only: `aria-hidden`, no pointer events, and
 * hidden below `md` so they never crowd a phone.
 */

type Art = { className?: string }

/** A tall millet / ragi stalk with a heavy grain head and two long leaves. */
export function MilletStalk({ className = "" }: Art) {
  const grains = Array.from({ length: 11 }, (_, i) => 52 + i * 11)
  return (
    <svg
      aria-hidden
      viewBox="0 0 120 420"
      fill="currentColor"
      className={`pointer-events-none select-none ${className}`}
    >
      <path d="M60 420 C57 320 66 210 60 52" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {grains.map((y, i) => (
        <g key={y}>
          <ellipse cx={51 - (i % 2) * 2} cy={y} rx="6" ry="10" transform={`rotate(-28 51 ${y})`} />
          <ellipse cx={69 + (i % 2) * 2} cy={y + 5} rx="6" ry="10" transform={`rotate(28 69 ${y + 5})`} />
        </g>
      ))}
      <ellipse cx="60" cy="44" rx="5" ry="11" />
      <path d="M61 300 C90 280 108 236 106 190 C86 214 68 252 61 300 Z" />
      <path d="M59 250 C30 236 12 196 14 150 C34 172 52 206 59 250 Z" />
      <path d="M60 372 C84 360 98 336 100 304 C82 320 68 342 60 372 Z" opacity="0.7" />
    </svg>
  )
}

/** A curry-leaf branch: a gently arched stem with paired leaves. */
export function CurryBranch({ className = "" }: Art) {
  const pairs = Array.from({ length: 7 }, (_, i) => i)
  return (
    <svg
      aria-hidden
      viewBox="0 0 220 360"
      fill="currentColor"
      className={`pointer-events-none select-none ${className}`}
    >
      <path d="M110 360 C104 280 120 180 150 20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {pairs.map((i) => {
        const t = i / 6
        const y = 330 - t * 290
        const x = 109 + t * 34 - Math.sin(t * Math.PI) * 6
        const s = 1 - t * 0.45
        return (
          <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
            <path d="M0 0 C-14 -10 -42 -10 -56 4 C-38 18 -12 14 0 0 Z" transform="rotate(-8)" />
            <path d="M0 0 C14 -12 42 -14 58 -2 C40 14 14 14 0 0 Z" transform="rotate(10)" />
          </g>
        )
      })}
      <path d="M150 22 C140 -2 164 -2 156 26 Z" />
    </svg>
  )
}

/** An eight-petal lotus kolam: concentric petals, a ring of dots, a centre. */
export function LotusKolam({ className = "" }: Art) {
  const petals = Array.from({ length: 8 }, (_, i) => i * 45)
  const dots = Array.from({ length: 16 }, (_, i) => i * 22.5)
  return (
    <svg
      aria-hidden
      viewBox="0 0 200 200"
      className={`pointer-events-none select-none ${className}`}
    >
      <g fill="none" stroke="currentColor" strokeWidth="2">
        {petals.map((a) => (
          <ellipse key={`o${a}`} cx="100" cy="52" rx="15" ry="38" transform={`rotate(${a} 100 100)`} />
        ))}
        {petals.map((a) => (
          <ellipse key={`i${a}`} cx="100" cy="72" rx="9" ry="22" transform={`rotate(${a + 22.5} 100 100)`} />
        ))}
        <circle cx="100" cy="100" r="9" />
      </g>
      <g fill="currentColor">
        {dots.map((a) => (
          <circle key={a} cx="100" cy="6" r="2.6" transform={`rotate(${a} 100 100)`} />
        ))}
        <circle cx="100" cy="100" r="3.5" />
      </g>
    </svg>
  )
}
