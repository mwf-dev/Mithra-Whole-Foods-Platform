import { Metadata } from "next"
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react"

import { BUSINESS, addressLine, mapsUrl } from "@lib/business"

export const metadata: Metadata = {
  title: `Contact us | ${BUSINESS.name}`,
  description: `Reach ${BUSINESS.name} by phone, email or WhatsApp. ${BUSINESS.legalName}, ${addressLine()}.`,
}

const WHATSAPP = `https://wa.me/${BUSINESS.phoneTel.replace("+", "")}`

function Row({
  icon,
  label,
  href,
  children,
  external,
}: {
  icon: React.ReactNode
  label: string
  href: string
  children: React.ReactNode
  external?: boolean
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group flex items-start gap-4 rounded-large border border-beige bg-white p-5 shadow-card-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span>
        <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-grey-50">{label}</span>
        <span className="mt-1 block break-all text-base font-medium text-charcoal group-hover:text-primary">
          {children}
        </span>
      </span>
    </a>
  )
}

export default function ContactPage() {
  return (
    <div className="content-container py-12 md:py-16">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Contact</p>
      <h1 className="font-display text-4xl leading-[1.1] text-charcoal md:text-5xl">
        We&apos;d love to hear from you
      </h1>
      <p className="mt-3 max-w-xl text-grey-60">
        Questions about an order, a product or delivery? Call, write or message us on WhatsApp.
      </p>

      <div className="mt-10 grid gap-4 md:grid-cols-2">
        <Row icon={<Phone size={20} />} label="Phone" href={`tel:${BUSINESS.phoneTel}`}>
          {BUSINESS.phoneDisplay}
        </Row>
        <Row icon={<MessageCircle size={20} />} label="WhatsApp" href={WHATSAPP} external>
          Message us on WhatsApp
        </Row>
        <Row icon={<Mail size={20} />} label="Email" href={`mailto:${BUSINESS.email}`}>
          {BUSINESS.email}
        </Row>
        <Row icon={<MapPin size={20} />} label="Address" href={mapsUrl()} external>
          {BUSINESS.legalName}
          <br />
          {BUSINESS.address.street}, {BUSINESS.address.city}, {BUSINESS.address.region}{" "}
          {BUSINESS.address.postalCode}
        </Row>
      </div>
    </div>
  )
}
