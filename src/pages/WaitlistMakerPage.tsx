import SEO, { createBreadcrumbSchema, createSoftwareApplicationSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import WaitlistEditor from '@/components/waitlist/WaitlistEditor';
import WaitlistMakerWallpaper from '@/components/wallpapers/WaitlistMakerWallpaper';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Startup Waitlist Page Builder',
    description: 'Create a startup waitlist page and validate demand before building the full product.',
    url: 'https://creatives-takeover.com/waitlist',
  },
  createSoftwareApplicationSchema({
    name: 'Waitlist Maker',
    description: 'Startup waitlist page builder for founders validating demand before product development.',
    url: '/waitlist',
    featureList: ['waitlist page builder', 'landing page copy', 'demand capture'],
  }),
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
        title="Startup Waitlist Page Builder | Creatives Takeover"
        description="Build a startup waitlist page, capture early signups, and validate demand before spending time on development."
        keywords="startup waitlist page builder, waitlist landing page, demand validation page, prelaunch signup page"
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
                <span className="takeover-gradient creatives-font">Startup Waitlist Page Builder</span>
              </h1>
              <p className="text-lg leading-relaxed text-muted-foreground md:text-xl">
                Create a pre-launch page, explain your offer clearly, and collect real demand signals before you build the product.
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
