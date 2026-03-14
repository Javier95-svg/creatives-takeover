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

        <main className="px-4 py-16 md:py-20">
          <div className="container mx-auto max-w-[1580px] space-y-8">
            <div className="space-y-4 px-2 text-center lg:max-w-4xl lg:text-left">
              <div className="inline-flex items-center rounded-full border border-primary/20 bg-background/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-primary shadow-sm backdrop-blur">
                Landing Page Studio
              </div>
              <h1 className="text-4xl font-bold creatives-font takeover-gradient md:text-6xl">Waitlist Maker</h1>
              <p className="text-lg text-muted-foreground md:text-xl leading-relaxed">
                Design your landing page, show what you have to offer, and validate real demand before building.
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
