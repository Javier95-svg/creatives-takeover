import SEO, { createBreadcrumbSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Badge } from '@/components/ui/badge';
import WaitlistEditor from '@/components/waitlist/WaitlistEditor';

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
    <div className="min-h-screen bg-background">
      <SEO
        title="Waitlist Maker - Creatives Takeover"
        description="Build your Stage II waitlist page and capture demand signals before development."
        keywords="waitlist page, demand validation, startup prototype"
        url="/waitlist"
        structuredData={structuredData}
      />
      <Navigation />

      <main className="py-20 px-4">
        <div className="container mx-auto max-w-4xl space-y-6">
          <div className="space-y-3 text-center">
            <Badge className="bg-primary/10 text-primary border-primary/20">Stage II: PROTOTYPE</Badge>
            <h1 className="text-3xl md:text-5xl font-bold creatives-font takeover-gradient">Waitlist Maker</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Describe your product in 3 fields — AI writes your landing page. Publish it, share the link, and watch signups roll in before you write a single line of code.
            </p>
          </div>

          <WaitlistEditor />
        </div>
      </main>

      <Footer />
    </div>
  );
}
