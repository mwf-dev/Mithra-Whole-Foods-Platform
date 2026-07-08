import { Home as HomePage } from '@/features/home/Home';
import { getHomepageSettings, getBestSellers, getCategories } from '@/services/medusa';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const [settings, bestSellers, categories] = await Promise.all([
    getHomepageSettings(),
    getBestSellers(),
    getCategories()
  ]);
  
  return (
    <HomePage settings={settings} bestSellers={bestSellers} categories={categories} />
  );
}
