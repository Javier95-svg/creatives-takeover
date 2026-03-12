import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import DirectoriesTab from '@/components/launch/DirectoriesTab';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Launch Directories',
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
    <div className="min-h-screen bg-background">
      <SEO
        title="Launch Directories - Creatives Takeover"
        description="Find the best platforms to submit and promote your startup or product launch. Filterable directory of 30+ communities, aggregators, review sites, and more."
        keywords="product launch directories, startup directories, product hunt, launch platforms"
        url="/directories"
        structuredData={structuredData}
      />
      <Navigation />

      <main className="py-20 px-4">
        <div className="container mx-auto max-w-5xl space-y-6">
          <div className="space-y-3 text-center">
            <Badge className="bg-primary/10 text-primary border-primary/20">Stage V: LAUNCH</Badge>
            <h1 className="text-3xl md:text-5xl font-bold creatives-font takeover-gradient">
              Launch Directories
            </h1>
            <p className="text-lg sm:text-xl md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
              Discover the best platforms to submit, share, and promote your startup launch.
            </p>
          </div>

          <DirectoriesTab />
        </div>
      </main>

      <Footer />
    </div>
  );
}
