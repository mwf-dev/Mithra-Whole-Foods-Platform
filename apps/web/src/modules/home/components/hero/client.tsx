"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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

// Banner artwork is authored around a wide 16:9 crop. Pinning the box to that
// ratio reserves the space before the image arrives, so the page below no
// longer jumps once it decodes.
//
// On phones 16:9 is the right shape — the viewport is narrow, so the derived
// height is modest. On a desktop it is not: at a 1920px-wide viewport, 16:9
// works out to 1080px tall, so the hero alone overflowed the screen and pushed
// everything below it out of view. From `md` up the box therefore switches to a
// clamped height instead of a ratio: never shorter than 320px, never taller
// than 60% of the viewport, and capped at 520px on very tall displays. That
// keeps the whole hero — and a hint of the section beneath it — on screen at
// any window size, which is what makes a landing page feel deliberate rather
// than like a wall.
const HERO_ASPECT =
  "aspect-[16/9] md:aspect-auto md:h-[clamp(20rem,60vh,32.5rem)]";

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
    <div className={`relative w-full ${HERO_ASPECT}`}>
      <Image
        src={safeSrc}
        alt={alt}
        fill
        sizes="100vw"
        priority={priority}
        quality={75}
        className="object-cover"
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
    // that runs past the fold. Rounded + clipped from `md` up, where the box
    // no longer spans the full width.
    <section className="relative w-full flex flex-col items-center bg-[#f0f4f0]">
      <div className="relative mx-auto w-full max-w-[1440px] grid grid-cols-1 grid-rows-1 overflow-hidden md:px-6 md:py-6 [&>*]:md:rounded-2xl [&>*]:md:overflow-hidden">
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
