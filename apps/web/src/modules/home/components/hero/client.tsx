"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";
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

const SLIDE_INTERVAL_MS = 5000;

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

  const hasBanners = slideCount > 0;
  const active = hasBanners ? banners[Math.min(slide, slideCount - 1)] : null;

  const displayTitle = active ? active.title : title;
  const displaySubtitle = active ? active.subtitle : subtitle;
  const displayImage = active?.image || bgImage;

  return (
    <section className="relative w-full h-[600px] md:h-[700px] flex items-center bg-gray-100 overflow-hidden">
      {/* Background image (crossfades between slides) */}
      <div
        key={hasBanners ? slide : "static"}
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700"
        style={{ backgroundImage: `url('${safeCssUrl(displayImage)}')` }}
        role="img"
        aria-label={displayTitle || "Farm fresh produce background"}
      ></div>
      <div className="absolute inset-0 bg-black/40"></div>

      <div className="relative z-10 content-container mx-auto px-4 md:px-8 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight max-w-4xl drop-shadow-md">
          {formatTitle(displayTitle)}
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl font-light tracking-wide drop-shadow">
          {displaySubtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href={active?.link || "/store"}
            className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-green-700 hover:bg-green-800 rounded-full transition-all duration-300 shadow-lg hover:shadow-green-900/20"
          >
            Shop Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          {!hasBanners && (
            <Link href="/about" className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all duration-300">
              <PlayCircle className="mr-2 w-5 h-5" />
              Our Story
            </Link>
          )}
        </div>
      </div>

      {/* Slide indicators */}
      {slideCount > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              aria-label={`Go to banner ${i + 1}`}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${
                i === slide ? "bg-white" : "bg-white/40 hover:bg-white/70"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
