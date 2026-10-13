import { Check } from "lucide-react"

/**
 * Three editorial statements supplied by the client, spread through the
 * homepage. The copy is theirs, verbatim — change it in the client's words,
 * not ours.
 */

const EYEBROW = "text-[11px] font-semibold uppercase tracking-[0.18em]"

/** Our philosophy — a calm, centred statement on cream. */
export function Philosophy() {
  return (
    <section aria-labelledby="philosophy-heading" className="bg-cream py-14 md:py-20">
      <div className="content-container mx-auto max-w-3xl text-center">
        <p className={`${EYEBROW} text-primary`}>Our philosophy</p>
        <h2
          id="philosophy-heading"
          className="mt-3 font-display text-3xl leading-[1.1] text-charcoal md:text-5xl"
        >
          Let food remain as close to nature as possible.
        </h2>
        <div className="mt-6 space-y-4 text-base leading-relaxed text-charcoal/80 md:text-lg">
          <p>Long before complicated ingredient lists became common, food was simple.</p>
          <p className="font-display text-xl leading-snug text-primary-dark md:text-2xl">
            Grains were grains.
            <br />
            Oil carried the natural aroma of its seeds.
            <br />
            Ghee carried the richness of milk and butter.
          </p>
          <p>Traditional foods were made from ingredients families knew and trusted.</p>
          <p>
            At Mithra Whole Foods, we believe there is something valuable in that simplicity.
          </p>
        </div>
        <p className="mx-auto mt-8 max-w-xl border-t border-primary/20 pt-6 font-display text-xl leading-snug text-primary-dark md:text-2xl">
          Our philosophy is not about changing food into something more.
          <br />
          It is about protecting what is already naturally there.
        </p>
      </div>
    </section>
  )
}

/** Why Mithra? — the family question, on the brand green. */
export function FamilyPromise() {
  return (
    <section aria-labelledby="family-heading" className="bg-primary-dark py-14 text-cream md:py-20">
      <div className="content-container mx-auto grid max-w-5xl gap-8 md:grid-cols-[1fr_1.2fr] md:items-center md:gap-14">
        <div>
          <p className={`${EYEBROW} text-cream/70`}>Why Mithra?</p>
          <h2
            id="family-heading"
            className="mt-3 font-display text-3xl leading-[1.1] md:text-5xl"
          >
            Because choosing food is choosing what becomes part of your family.
          </h2>
        </div>
        <div className="space-y-4 text-base leading-relaxed text-cream/85 md:text-lg">
          <p>
            Food is one of the few things we choose for ourselves and our families every
            single day.
          </p>
          <p>That makes every ingredient important.</p>
          <p>
            We carefully select our products with a simple question in mind:
          </p>
          <blockquote className="border-l-2 border-cream/50 pl-4 font-display text-2xl leading-snug text-cream md:text-3xl">
            “Would we be happy to serve this to our own family?”
          </blockquote>
          <p>
            That question guides the way we think about ingredients, processing, purity and
            quality.
          </p>
          <p className="font-semibold text-cream">
            Because your family deserves the same care we expect for ours.
          </p>
        </div>
      </div>
    </section>
  )
}

const PURITY = [
  "No Artificial Colors",
  "No Unnecessary Preservatives",
  "No Unnecessary Additives",
  "Carefully Selected Ingredients",
  "Minimal Processing",
  "Traditional Methods Wherever Possible",
  "Preserving Natural Taste, Aroma & Nutritional Qualities",
]

/** Our purity promise — the checklist. */
export function PurityPromise() {
  return (
    <section aria-labelledby="purity-heading" className="bg-white py-14 md:py-20">
      <div className="content-container mx-auto max-w-5xl">
        <div className="max-w-2xl">
          <p className={`${EYEBROW} text-primary`}>Our purity promise</p>
          <h2
            id="purity-heading"
            className="mt-3 font-display text-3xl leading-[1.1] text-charcoal md:text-5xl"
          >
            What we leave out matters as much as what we put in.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-charcoal/80 md:text-lg">
            At Mithra Whole Foods, purity is not simply a word on our packaging. It is a
            principle behind our products.
          </p>
        </div>

        <p className="mt-8 text-sm font-semibold text-charcoal">We focus on:</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {PURITY.map((item) => (
            <li
              key={item}
              className="flex items-start gap-3 rounded-large bg-cream px-4 py-3.5 text-[15px] font-medium text-charcoal"
            >
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary text-white">
                <Check size={13} strokeWidth={3} aria-hidden />
              </span>
              {item}
            </li>
          ))}
        </ul>

        <p className="mt-8 max-w-2xl font-display text-xl leading-snug text-primary-dark md:text-2xl">
          We don&apos;t believe food needs unnecessary additions to become better. Sometimes,
          less is what keeps food closer to its true nature.
        </p>
      </div>
    </section>
  )
}
