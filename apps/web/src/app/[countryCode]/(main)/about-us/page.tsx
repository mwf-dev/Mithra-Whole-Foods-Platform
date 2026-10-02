import { Metadata } from "next"
import { Check } from "lucide-react"

import { BUSINESS, RANGE, addressLine } from "@lib/business"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: `About us | ${BUSINESS.name}`,
  description: `${BUSINESS.name} — ${BUSINESS.tagline}. Traditional South Indian foods, millets, cold pressed oils and pure cow ghee, shipped from ${BUSINESS.address.city}, ${BUSINESS.address.region}.`,
}

export default function AboutPage() {
  return (
    <div className="content-container py-12 md:py-16">
      <p className="font-brand text-3xl font-bold leading-none text-primary md:text-4xl">
        {BUSINESS.tagline}
      </p>
      <h1 className="mt-2 font-display text-4xl leading-[1.1] text-charcoal md:text-5xl">
        About {BUSINESS.name}
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-grey-60">
        {BUSINESS.name} brings traditional South Indian foods to kitchens across the US. We
        are {BUSINESS.legalName}, based in {BUSINESS.address.city}, {BUSINESS.address.region}, and
        every order ships from there.
      </p>

      <section aria-labelledby="range-heading" className="mt-12">
        <h2 id="range-heading" className="font-display text-2xl text-charcoal md:text-3xl">
          What we make
        </h2>
        <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          {RANGE.map((item) => (
            <li key={item} className="flex items-center gap-3 text-base text-charcoal">
              <span
                aria-hidden
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
              >
                <Check size={14} strokeWidth={3} />
              </span>
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-6 inline-flex rounded-full border border-primary/40 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          No preservatives | No additives
        </p>
      </section>

      <div className="mt-12 flex flex-col gap-3 sm:flex-row">
        <LocalizedClientLink
          href="/store"
          className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-base font-semibold text-white shadow-card transition hover:-translate-y-0.5"
        >
          Shop all products
        </LocalizedClientLink>
        <LocalizedClientLink
          href="/contact"
          className="inline-flex h-12 items-center justify-center rounded-full border border-beige px-7 text-base font-semibold text-charcoal transition hover:border-primary/50"
        >
          Contact us
        </LocalizedClientLink>
      </div>

      <p className="mt-10 text-sm text-grey-50">
        {BUSINESS.legalName} · {addressLine()}
      </p>
    </div>
  )
}
