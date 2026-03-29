import SEO, { createBreadcrumbSchema, createSoftwareApplicationSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import DirectoriesTab from '@/components/launch/DirectoriesTab';
import GTMStrategistWallpaper from '@/components/wallpapers/GTMStrategistWallpaper';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Startup Launch Directories',
    description: 'Curated list of startup launch directories, communities, and listing platforms to promote a new product.',
    url: 'https://creatives-takeover.com/directories',
  },
  createSoftwareApplicationSchema({
    name: 'Launch Directories',
    description: 'Directory of startup launch platforms and communities for promoting new products.',
    url: '/directories',
    featureList: ['launch platform directory', 'community listings', 'product promotion resources'],
  }),
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
        title="Startup Launch Directories | Creatives Takeover"
        description="Browse startup launch directories, communities, and listing platforms to promote your product and reach early users."
        keywords="startup launch directories, product launch directories, startup directories list, launch platforms, product hunt alternatives"
        url="/directories"
        structuredData={structuredData}
      />
      <GTMStrategistWallpaper />
      <div className="relative z-10">
        <Navigation />

        <main className="px-4 pt-28 pb-20 md:pt-32 lg:pt-36">
          <div className="container mx-auto max-w-5xl space-y-6">
            <div className="space-y-3 text-center">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold creatives-font takeover-gradient leading-tight pb-2">
                Startup Launch Directories
              </h1>
              <p className="text-lg sm:text-xl md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
                Discover communities, launch platforms, and listing sites where founders can submit and promote new products.
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
