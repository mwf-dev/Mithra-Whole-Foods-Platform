import { Home as HomePage } from '@/features/home/Home';
import { getHomepageSettings, getBestSellers, getCategories } from '@/services/medusa';

export default async function Page() {
  const settings = await getHomepageSettings();
  const bestSellers = await getBestSellers();
  const categories = await getCategories();
  
  return (
    <HomePage settings={settings} bestSellers={bestSellers} categories={categories} />
  );
}
