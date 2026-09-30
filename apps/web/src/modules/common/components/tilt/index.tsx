"use client"

import { useRef } from "react"

/**
 * Wraps a card so it tilts toward the cursor and lifts on hover. Only mouse
 * pointers drive it (touch scrolling must not wobble cards), the pointer
 * position is written to CSS variables inside one animation frame — no React
 * renders — and `prefers-reduced-motion` disables it in globals.css.
 *
 * `shine` adds a soft highlight that follows the cursor.
 */
export default function Tilt({
  children,
  className = "",
  style,
  shine = false,
  as: Tag = "div",
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  shine?: boolean
  as?: "div" | "li"
}) {
  const ref = useRef<HTMLElement>(null)
  const frame = useRef(0)

  const set = (tx: number, ty: number, lift: string) => {
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      const el = ref.current
      if (!el) return
      el.style.setProperty("--tx", tx.toFixed(3))
      el.style.setProperty("--ty", ty.toFixed(3))
      el.style.setProperty("--lift", lift)
    })
  }

  return (
    <Tag
      ref={ref as any}
      className={`mithra-tilt relative ${className}`}
      style={style}
      onPointerMove={(e: React.PointerEvent<HTMLElement>) => {
        if (e.pointerType !== "mouse") return
        const r = e.currentTarget.getBoundingClientRect()
        set(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          ((e.clientY - r.top) / r.height) * 2 - 1,
          "-4px"
        )
      }}
      onPointerLeave={() => set(0, 0, "0px")}
    >
      {children}
      {shine && (
        <span
          aria-hidden
          className="mithra-tilt-shine pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 [.mithra-tilt:hover>&]:opacity-100"
        />
      )}
    </Tag>
  )
}
