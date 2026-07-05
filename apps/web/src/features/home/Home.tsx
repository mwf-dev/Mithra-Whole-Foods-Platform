"use client"
import { useEffect, useState } from 'react';
import { Hero } from './components/Hero';
import { ShopByCategory } from './components/ShopByCategory';
import { BestSellers } from './components/BestSellers';
import { Collections } from './components/Collections';
import { WhyChooseUs } from './components/WhyChooseUs';
import { TrustStrip } from './components/TrustStrip';
import { Newsletter } from './components/Newsletter';
import type { HomepageSettings } from '@/services/medusa';

export function Home({ settings: initialSettings, bestSellers = [], categories = [] }: { settings: HomepageSettings | null, bestSellers?: any[], categories?: any[] }) {
  const [settings, setSettings] = useState<HomepageSettings | null>(initialSettings);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'UPDATE_PREVIEW') {
        setSettings(event.data.settings);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="flex flex-col w-full bg-[#FAFAFA]">
      <Hero settings={settings} />
      <ShopByCategory categories={categories} />
      <BestSellers products={bestSellers} />
      <Collections settings={settings} />
      <WhyChooseUs />
      <TrustStrip />
      <Newsletter />
    </div>
  );
}
