import { Hero } from './components/Hero';
import { ShopByCategory } from './components/ShopByCategory';
import { BestSellers } from './components/BestSellers';
import { Collections } from './components/Collections';
import { WhyChooseUs } from './components/WhyChooseUs';
import { TrustStrip } from './components/TrustStrip';
import { Newsletter } from './components/Newsletter';

export function Home() {
  return (
    <div className="flex flex-col w-full bg-[#FAFAFA]">
      <Hero />
      <ShopByCategory />
      <BestSellers />
      <Collections />
      <WhyChooseUs />
      <TrustStrip />
      <Newsletter />
    </div>
  );
}
