import { notFound } from 'next/navigation';
import { ProductDetails } from '@/features/product/ProductDetails';
import { getProductByHandle, getProducts } from '@/services/medusa';

export const dynamic = 'force-dynamic';

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const product = await getProductByHandle(handle);
  
  if (!product) {
    notFound();
  }
  
  // Fetch related products (same category)
  let relatedProducts: any[] = [];
  if (product.categories && product.categories.length > 0) {
    relatedProducts = await getProducts(product.categories[0].id);
    // Filter out the current product
    relatedProducts = relatedProducts.filter(p => p.id !== product.id);
  } else {
    // Fallback to all products
    relatedProducts = await getProducts();
    relatedProducts = relatedProducts.filter(p => p?.id !== product.id);
  }
  
  return (
    <ProductDetails product={product} relatedProducts={relatedProducts} />
  );
}
