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

        <main className="px-4 pt-28 pb-16 md:pt-32 md:pb-20 lg:pt-36">
          <div className="container mx-auto max-w-[1580px] space-y-8">
            <div className="mx-auto max-w-4xl space-y-4 px-2 text-center">
              <h1 className="pb-2 text-center font-bold leading-[0.95] text-4xl sm:text-5xl md:text-6xl lg:text-7xl">
                <span className="takeover-gradient creatives-font">Waitlist Maker</span>
              </h1>
              <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
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
