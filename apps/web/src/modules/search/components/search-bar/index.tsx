"use client"

import { Search } from "lucide-react"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"

/**
 * Functional storefront search. Submits to /{countryCode}/search?q=… which is
 * served by the Medusa store product search (free-text over title/description).
 */
export default function SearchBar({
  className,
  defaultValue = "",
}: {
  className?: string
  defaultValue?: string
}) {
  const router = useRouter()
  const params = useParams()
  const countryCode = (params?.countryCode as string) || "us"
  const [term, setTerm] = useState(defaultValue)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = term.trim()
    if (!q) return
    router.push(`/${countryCode}/search?q=${encodeURIComponent(q)}`)
  }

  return (
    <form
      onSubmit={submit}
      role="search"
      className={
        className ??
        "hidden lg:flex items-center max-w-md w-full bg-[#f8f8f8] rounded-full pl-5 pr-1.5 py-1.5"
      }
    >
      <input
        type="text"
        name="q"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search for millets, oils, rice, health mixes..."
        aria-label="Search products"
        className="bg-transparent border-none outline-none flex-1 text-sm text-gray-700 placeholder-gray-400"
      />
      <button
        type="submit"
        aria-label="Search"
        className="bg-[#2E5C31] text-white p-2 rounded-full flex items-center justify-center h-9 w-9 hover:bg-[#244a27] transition-colors shrink-0"
      >
        <Search size={16} />
      </button>
    </form>
  )
}
