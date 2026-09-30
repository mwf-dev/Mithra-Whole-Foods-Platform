"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

/**
 * Discount code chip with a copy button. Clipboard access can be refused
 * (older browsers, some in-app webviews); the code stays visible and
 * selectable either way, so a refusal just means "copy it by hand".
 */
export function CopyCode({ code, ink, deep }: { code: string; ink: string; deep: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        } catch {
          // Leave the code on screen for manual copying.
        }
      }}
      className="relative z-20 inline-flex w-max items-center gap-2 rounded-rounded border-2 border-dashed px-3 py-1.5 text-sm font-bold tracking-wider transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      style={{ borderColor: ink, color: ink }}
      aria-label={copied ? `Code ${code} copied` : `Copy code ${code}`}
    >
      <span className="select-all">{code}</span>
      <span
        className="grid h-6 w-6 place-items-center rounded-full"
        style={{ backgroundColor: deep, color: "#FFFFFF" }}
        aria-hidden
      >
        {copied ? <Check size={13} strokeWidth={3} /> : <Copy size={12} />}
      </span>
      <span aria-live="polite" className="sr-only">
        {copied ? "Copied" : ""}
      </span>
    </button>
  )
}
