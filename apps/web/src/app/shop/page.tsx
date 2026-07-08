import { Shop } from '@/features/shop/Shop';
import { getProducts, getCategories } from '@/services/medusa';
import { Header } from '@/features/layout/components/Header';
import { Footer } from '@/features/layout/components/Footer';

export default async function ShopPage() {
  const products = await getProducts();
  const categories = await getCategories();
  
  return (
    <>
      <Header />
      <Shop products={products} categories={categories} />
      <Footer />
    </>
  );
}
