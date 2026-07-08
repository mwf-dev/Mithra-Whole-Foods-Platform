import { HeroClient } from './client'

interface HomepageSettings {
  hero_title?: string;
  hero_subtitle?: string;
  hero_image_url?: string;
}

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

export function Hero({ settings }: { settings?: HomepageSettings | null }) {
  // Use settings data if available, otherwise fallback to defaults
  const title = settings?.hero_title || "Ancient Foods.\\nTimeless Nutrition.";
  const subtitle = settings?.hero_subtitle || "Premium quality traditional foods for a healthier you and a happier planet.";
  
  // Medusa local file module serves files under /uploads
  // We need to construct the full URL if the image URL is just a relative path
  let bgImage = "https://placehold.co/1920x800/e6efe8/2e5c31?text=Farm+Background+Image";
  if (settings?.hero_image_url) {
    bgImage = settings.hero_image_url;
    if (bgImage.startsWith('/')) {
      bgImage = `${BACKEND_URL}${bgImage}`;
    }
  }

  return <HeroClient initialTitle={title} initialSubtitle={subtitle} initialBgImage={bgImage} backendUrl={BACKEND_URL} />;
}
