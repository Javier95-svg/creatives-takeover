import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import WaitlistEditor from '@/components/waitlist/WaitlistEditor';
import WaitlistMakerWallpaper from '@/components/wallpapers/WaitlistMakerWallpaper';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Waitlist Maker',
    description: 'Create and publish your waitlist page to validate demand before building.',
    url: 'https://creatives-takeover.com/waitlist',
  },
  createBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'BizMap AI', url: '/bizmap-ai' },
    { name: 'Waitlist Maker', url: '/waitlist' },
  ]),
];

export default function WaitlistMakerPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SEO
        title="Waitlist Maker - Creatives Takeover"
        description="Build your Stage II waitlist page and capture demand signals before development."
        keywords="waitlist page, demand validation, startup prototype"
        url="/waitlist"
        structuredData={structuredData}
      />
      <WaitlistMakerWallpaper />
      <div className="relative z-10">
        <Navigation />

        <main className="py-20 px-4">
          <div className="container mx-auto max-w-4xl space-y-6">
            <div className="space-y-3 text-center">
              <h1 className="text-3xl md:text-5xl font-bold creatives-font takeover-gradient">Waitlist Maker</h1>
              <p className="text-lg sm:text-xl md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
                Design your landing page, show what you have to offer, and validate real real demand before building.
              </p>
            </div>

            <WaitlistEditor />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
