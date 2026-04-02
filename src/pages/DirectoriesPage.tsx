import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import DirectoriesTab from '@/components/launch/DirectoriesTab';
import GTMStrategistWallpaper from '@/components/wallpapers/GTMStrategistWallpaper';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Directories',
    description: 'Curated list of startup and product launch platforms to promote your launch.',
    url: 'https://creatives-takeover.com/directories',
  },
  createBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'BizMap AI', url: '/bizmap-ai' },
    { name: 'Directories', url: '/directories' },
  ]),
];

export default function DirectoriesPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SEO
        title="Directories - Creatives Takeover"
        description="Find the best platforms to submit and promote your startup or product launch. Filterable directory of 30+ communities, aggregators, review sites, and more."
        keywords="product launch directories, startup directories, product hunt, launch platforms"
        url="/directories"
        structuredData={structuredData}
      />
      <GTMStrategistWallpaper />
      <div className="relative z-10">
        <Navigation />

        <main className="px-4 py-20">
          <div className="container mx-auto max-w-5xl space-y-6">
            <div className="space-y-3 text-center">
              <h1 className="pb-2 text-3xl font-bold leading-tight creatives-font takeover-gradient sm:text-4xl md:text-5xl lg:text-6xl">
                Directories
              </h1>
              <p className="mx-auto max-w-3xl px-4 text-lg leading-relaxed text-muted-foreground sm:text-xl md:text-xl">
                Discover the best platforms to submit, share, and promote your startup launch.
              </p>
            </div>

            <DirectoriesTab />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
