import { HeroClient } from './client'
import { HomepageSettings, resolveBackendImage } from '@lib/data/homepage'

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

export function Hero({ settings }: { settings?: HomepageSettings | null }) {
  // Use settings data if available, otherwise fallback to defaults
  const title = settings?.hero_title || "Ancient Foods.\\nTimeless Nutrition.";
  const subtitle = settings?.hero_subtitle || "Premium quality traditional foods for a healthier you and a happier planet.";

  let bgImage = "https://placehold.co/1920x800/e6efe8/2e5c31?text=Farm+Background+Image";
  if (settings?.hero_image_url) {
    bgImage = resolveBackendImage(settings.hero_image_url);
  }

  // Rotating banners (admin-managed) take precedence over the single hero
  const banners = (settings?.hero_banners ?? [])
    .filter((b) => b.title || b.image_url)
    .map((b) => ({
      title: b.title || "",
      subtitle: b.subtitle || "",
      image: resolveBackendImage(b.image_url),
      link: b.link || "/store",
    }));

  return (
    <HeroClient
      initialTitle={title}
      initialSubtitle={subtitle}
      initialBgImage={bgImage}
      initialBanners={banners}
      backendUrl={BACKEND_URL}
    />
  );
}
