import { ProductDetails } from '@/features/product/ProductDetails';
import { getProductByHandle, getProducts } from '@/services/medusa';
import { Header } from '@/features/layout/components/Header';
import { Footer } from '@/features/layout/components/Footer';

export default async function ProductPage({ params }: { params: { handle: string } }) {
  const product = await getProductByHandle(params.handle);
  
  // Fetch related products (same category)
  let relatedProducts: any[] = [];
  if (product && product.categories && product.categories.length > 0) {
    relatedProducts = await getProducts(product.categories[0].id);
    // Filter out the current product
    relatedProducts = relatedProducts.filter(p => p.id !== product.id);
  } else {
    // Fallback to all products
    relatedProducts = await getProducts();
    relatedProducts = relatedProducts.filter(p => p?.id !== product?.id);
  }
  
  return (
    <>
      <Header />
      <ProductDetails product={product} relatedProducts={relatedProducts} />
      <Footer />
    </>
  );
}
