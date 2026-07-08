import { Shop } from '@/features/shop/Shop';
import { getProducts, getCategories } from '@/services/medusa';

export const dynamic = 'force-dynamic';

export default async function ShopPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const products = await getProducts();
  const categories = await getCategories();
  const { category } = await searchParams;
  
  return (
    <Shop products={products} categories={categories} initialCategory={category || 'All'} />
  );
}
