"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, PlayCircle } from "lucide-react";

interface HeroClientProps {
  initialTitle: string;
  initialSubtitle: string;
  initialBgImage: string;
  backendUrl: string;
}

export function HeroClient({ initialTitle, initialSubtitle, initialBgImage, backendUrl }: HeroClientProps) {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState(initialSubtitle);
  const [bgImage, setBgImage] = useState(initialBgImage);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Allow localhost connections for the preview
      if (event.origin !== "http://localhost:9000" && event.origin !== "http://localhost:8000") {
        return;
      }

      if (event.data?.type === 'UPDATE_PREVIEW' && event.data?.settings) {
        const settings = event.data.settings;
        
        if (settings.hero_title) setTitle(settings.hero_title);
        if (settings.hero_subtitle) setSubtitle(settings.hero_subtitle);
        
        if (settings.hero_image_url) {
          let newBg = settings.hero_image_url;
          if (newBg.startsWith('/')) {
            newBg = `${backendUrl}${newBg}`;
          }
          setBgImage(newBg);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [backendUrl]);

  const formattedTitle = title.split('\\n').map((line, i, arr) => (
    <span key={i}>
      {line}
      {i < arr.length - 1 && <br />}
    </span>
  ));

  return (
    <section className="relative w-full h-[600px] md:h-[700px] flex items-center bg-gray-100 overflow-hidden">
      {/* Background Image Placeholder */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${bgImage}')` }}
      ></div>
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="relative z-10 content-container mx-auto px-4 md:px-8 flex flex-col items-center text-center">
        <h1 className="text-4xl md:text-6xl font-serif font-bold text-white mb-6 leading-tight max-w-4xl drop-shadow-md">
          {formattedTitle}
        </h1>
        <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl font-light tracking-wide drop-shadow">
          {subtitle}
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/store" className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-green-700 hover:bg-green-800 rounded-full transition-all duration-300 shadow-lg hover:shadow-green-900/20">
            Shop Now
            <ArrowRight className="ml-2 w-5 h-5" />
          </Link>
          <Link href="/about" className="inline-flex items-center justify-center px-8 py-4 text-base font-medium text-white bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-full transition-all duration-300">
            <PlayCircle className="mr-2 w-5 h-5" />
            Our Story
          </Link>
        </div>
      </div>
    </section>
  );
}
