import { TopBanner } from './components/TopBanner';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { Footer } from './components/Footer';

export function GlobalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <TopBanner />
      <Header />
      <CategoryNav />
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
