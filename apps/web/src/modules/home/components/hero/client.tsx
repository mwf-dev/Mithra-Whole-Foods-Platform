"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import LocalizedClientLink from "@modules/common/components/localized-client-link";
import { safeCssUrl } from "@lib/util/safe-css-url";

interface Banner {
  title: string;
  subtitle: string;
  image: string;
  link: string;
}

interface HeroClientProps {
  initialTitle: string;
  initialSubtitle: string;
  initialBgImage: string;
  initialBanners: Banner[];
  backendUrl: string;
}

const SLIDE_INTERVAL_MS = 6000;

// One fixed box for every slide, sized so the *whole* banner is visible.
//
// Two requirements pull against each other here. Banners are admin-uploaded, so
// their aspect ratios are not guaranteed to match each other — but the carousel
// must not resize between slides, or the page jumps on every rotation. So the
// box height is static and the image is fitted inside it with `object-contain`
// (see HeroImage). Nothing is ever cropped; a banner narrower or wider than the
// box simply sits centred with the section background either side. That holds
// however many slides get added, and whatever shape they are.
//
// On phones 16:9 is the right shape — the viewport is narrow, so the derived
// height is modest and matches how the artwork is authored. On a desktop it is
// not: at a 1920px-wide viewport, 16:9 works out to 1080px tall, so the hero
// alone overflowed the screen and pushed everything below it out of view. From
// `md` up the box therefore switches to a clamped height instead of a ratio:
// never shorter than 384px, never taller than 70% of the viewport, capped at
// 640px on very tall displays. That is enough room to show a 16:9 banner nearly
// full-width while still leaving the next section peeking above the fold.
const HERO_ASPECT =
  "aspect-[16/9] md:aspect-auto md:h-[clamp(24rem,70vh,40rem)]";

/**
 * Banner links are admin-authored. Internal paths must carry the country code
 * — without it middleware answers with a 307, which the App Router cannot
 * follow client-side and downgrades into a full document reload. Absolute URLs
 * are left alone and sent through a plain anchor.
 */
function HeroLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  if (/^https?:\/\//i.test(href)) {
    return (
      <a href={href} className="block w-full" rel="noopener noreferrer">
        {children}
      </a>
    );
  }

  // The hero is the primary entry point into the catalogue and the banners
  // mostly resolve to the same handful of URLs (prefetches dedupe by href),
  // so a full prefetch here is cheap and removes the wait on the main CTA.
  return (
    <LocalizedClientLink href={href} prefetch className="block w-full">
      {children}
    </LocalizedClientLink>
  );
}

/**
 * A single banner, routed through next/image so it is resized and served as
 * AVIF/WebP rather than shipping the multi-megabyte original.
 */
function HeroImage({
  src,
  alt,
  priority,
  mounted,
}: {
  src: string;
  alt: string;
  priority?: boolean;
  mounted?: boolean;
}) {
  // Rejects anything that isn't http(s)/root-relative/data-image. next/image
  // throws on an empty src, so fall back to the flat brand tile instead.
  const safeSrc = safeCssUrl(src);

  if (!safeSrc || !mounted) {
    return <div className={`w-full ${HERO_ASPECT} bg-[#e6efe8]`} />;
  }

  return (
    <div
      className={`relative w-full ${HERO_ASPECT} flex items-center justify-center`}
    >
      {/*
        Intrinsically sized rather than `fill`, so the <img> element is exactly
        the visible banner — which is what lets `rounded-2xl` round the real
        image edges. With `fill` + `object-contain` the element still spans the
        whole box, so the radius landed on empty letterbox area and the banner
        itself stayed square-cornered.

        `h-full w-auto` pins every slide to the same height and lets width
        follow the image's own ratio: nothing is cropped, and the box never
        resizes between slides. `max-w-full` is the guard for a banner uploaded
        taller than the box; `object-contain` keeps it undistorted if it hits.
        The width/height props are only the intrinsic hint next/image requires —
        CSS decides the rendered size.
      */}
      <Image
        src={safeSrc}
        alt={alt}
        width={1920}
        height={1080}
        sizes="100vw"
        priority={priority}
        quality={75}
        className="h-full w-auto max-w-full object-contain rounded-2xl"
      />
    </div>
  );
}

function resolveImage(url: string, backendUrl: string): string {
  if (url && url.startsWith("/")) {
    return `${backendUrl}${url}`;
  }
  return url;
}

// Titles may contain real newlines (typed in admin) or the literal "\n"
// stored by the seed default — normalize both to line breaks.
function formatTitle(title: string) {
  return title
    .replace(/\\n/g, "\n")
    .split("\n")
    .map((line, i, arr) => (
      <span key={i}>
        {line}
        {i < arr.length - 1 && <br />}
      </span>
    ));
}

export function HeroClient({
  initialTitle,
  initialSubtitle,
  initialBgImage,
  initialBanners,
  backendUrl,
}: HeroClientProps) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [bgImage, setBgImage] = useState(initialBgImage);
  const [banners, setBanners] = useState<Banner[]>(initialBanners);
  const [slide, setSlide] = useState(0);

  // Live-preview channel from the admin panel (served from the backend origin)
  useEffect(() => {
    const allowedOrigins = new Set(["http://localhost:9000", "http://localhost:8000"]);
    try {
      allowedOrigins.add(new URL(backendUrl).origin);
    } catch {
      // ignore malformed backend URL; localhost fallbacks remain
    }

    const handleMessage = (event: MessageEvent) => {
      if (!allowedOrigins.has(event.origin)) {
        return;
      }

      if (event.data?.type === 'UPDATE_PREVIEW' && event.data?.settings) {
        const settings = event.data.settings;

        if (settings.hero_title) setTitle(settings.hero_title);
        if (settings.hero_subtitle) setSubtitle(settings.hero_subtitle);
        if (settings.hero_image_url) {
          setBgImage(resolveImage(settings.hero_image_url, backendUrl));
        }
        if (Array.isArray(settings.hero_banners)) {
          setBanners(
            settings.hero_banners
              .filter((b: any) => b && (b.title || b.image_url))
              .map((b: any) => ({
                title: b.title || "",
                subtitle: b.subtitle || "",
                image: resolveImage(b.image_url || "", backendUrl),
                link: b.link || "/store",
              }))
          );
          setSlide(0);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [backendUrl]);

  // Auto-advance the banner slider
  const slideCount = banners.length;
  useEffect(() => {
    if (slideCount < 2) {
      return;
    }
    const id = setInterval(
      () => setSlide((s) => (s + 1) % slideCount),
      SLIDE_INTERVAL_MS
    );
    return () => clearInterval(id);
  }, [slideCount]);

  // Every slide sits in the same grid cell and is merely faded out, so the
  // browser treats them all as in-viewport and `loading="lazy"` would not
  // defer them. Track the furthest slide reached and only mount images up to
  // one ahead of it — the first paint then costs a single banner instead of
  // the whole carousel, while the next one is always warm before it fades in.
  const [maxSeen, setMaxSeen] = useState(0);
  useEffect(() => {
    setMaxSeen((m) => Math.max(m, slide));
  }, [slide]);

  const hasBanners = slideCount > 0;

  return (
    // Full-bleed background, contained foreground. The banner is centred and
    // capped at the same max width the rest of the page uses, so on a wide
    // monitor it reads as a deliberate card rather than an edge-to-edge image
    // that runs past the fold. The corner radius lives on the <img> itself
    // (see HeroImage) — the banner does not fill this box, so rounding the box
    // would round empty space instead of the artwork.
    <section className="relative w-full flex flex-col items-center bg-[#f0f4f0]">
      <div
        id="hero-carousel"
        aria-live="polite"
        className="relative mx-auto w-full max-w-[1440px] grid grid-cols-1 grid-rows-1 md:px-6 md:py-6"
      >
        {hasBanners ? (
          banners.map((b, i) => (
            <div
              key={i}
              className={`col-start-1 row-start-1 transition-all duration-1000 ease-in-out ${
                i === slide
                  ? "opacity-100 translate-x-0 z-10"
                  : "opacity-0 translate-x-4 z-0 pointer-events-none"
              }`}
            >
              <HeroLink href={b.link || "/store"}>
                <HeroImage
                  src={b.image}
                  alt={b.title || "Hero background"}
                  // The visible banner is the LCP element: fetch it eagerly.
                  priority={i === 0}
                  mounted={i <= maxSeen + 1}
                />
              </HeroLink>
            </div>
          ))
        ) : (
          <div className="col-start-1 row-start-1 opacity-100 z-10">
            <HeroLink href="/store">
              <HeroImage
                src={bgImage}
                alt={title || "Hero background"}
                priority
                mounted
              />
            </HeroLink>
          </div>
        )}
      </div>

      {/*
        Manual prev/next. These sit in the gutters either side of the banner —
        the space `object-contain` leaves when a slide is narrower than the box.
        Auto-advance is untouched; this only adds a way to drive it by hand.

        Rendered outside the slide grid so they are not inside the <a> that
        wraps each banner: nested interactive elements are invalid, and a click
        would otherwise navigate to the product page instead of changing slide.
      */}
      {slideCount > 1 && (
        <>
          <button
            type="button"
            onClick={() => setSlide((s) => (s - 1 + slideCount) % slideCount)}
            aria-label="Previous banner"
            aria-controls="hero-carousel"
            className="absolute left-1 md:left-3 top-1/2 -translate-y-1/2 z-20 grid h-9 w-9 md:h-11 md:w-11 place-items-center rounded-full bg-white/80 text-[#2E5C31] shadow-md backdrop-blur-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E5C31]"
          >
            <ChevronLeft size={22} strokeWidth={2} aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setSlide((s) => (s + 1) % slideCount)}
            aria-label="Next banner"
            aria-controls="hero-carousel"
            className="absolute right-1 md:right-3 top-1/2 -translate-y-1/2 z-20 grid h-9 w-9 md:h-11 md:w-11 place-items-center rounded-full bg-white/80 text-[#2E5C31] shadow-md backdrop-blur-sm transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2E5C31]"
          >
            <ChevronRight size={22} strokeWidth={2} aria-hidden />
          </button>
        </>
      )}

      {/* Slide indicators */}
      {slideCount > 1 && (
        <div className="absolute bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full transition-colors shadow-sm ${
                i === slide ? "bg-white" : "bg-white/50 hover:bg-white/80"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
