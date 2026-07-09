/**
 * Thin admin-managed announcement strip above the header
 * (e.g. "Free delivery on orders above ₹499"). Hidden when empty.
 */
export function AnnouncementBar({ text }: { text?: string | null }) {
  if (!text) {
    return null
  }

  return (
    <div className="bg-[#2E5C31] text-white text-center text-xs md:text-sm py-2 px-4 font-medium">
      {text}
    </div>
  )
}
