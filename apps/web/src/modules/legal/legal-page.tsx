import { BUSINESS, addressLine } from "@lib/business"

export const LEGAL_UPDATED = "October 8, 2026"

export function LegalPage({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="content-container py-12 md:py-16">
      <article className="mx-auto max-w-3xl text-charcoal [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_p]:mt-3 [&_p]:leading-relaxed [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1">
        <h1 className="font-display text-4xl leading-[1.1] md:text-5xl">{title}</h1>
        <p className="mt-2 text-sm text-grey-50">Last updated {LEGAL_UPDATED}</p>
        {children}
        <h2>Contact</h2>
        <p>
          {BUSINESS.legalName} ({BUSINESS.name}), {addressLine()}.{" "}
          Phone <a className="underline" href={`tel:${BUSINESS.phoneTel}`}>{BUSINESS.phoneDisplay}</a>,{" "}
          email <a className="underline" href={`mailto:${BUSINESS.email}`}>{BUSINESS.email}</a>.
        </p>
      </article>
    </div>
  )
}
