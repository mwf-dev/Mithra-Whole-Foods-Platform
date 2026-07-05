import { Home as HomePage } from '@/features/home/Home';
import { getHomepageSettings } from '@/services/medusa';

export default async function Page() {
  const settings = await getHomepageSettings();
  
  return (
    <HomePage settings={settings} />
  );
}
