import SEO, { createBreadcrumbSchema, createFAQSchema, createSoftwareApplicationSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import AnswerSummary from '@/components/seo/AnswerSummary';
import PageFAQSection from '@/components/seo/PageFAQSection';
import WaitlistEditor from '@/components/waitlist/WaitlistEditor';
import WaitlistMakerWallpaper from '@/components/wallpapers/WaitlistMakerWallpaper';

export default function WaitlistMakerPage() {
  const faqs = [
    {
      question: 'Why should founders build a waitlist before an MVP?',
      answer:
        'A waitlist is a lightweight way to test demand before you build. If people will not sign up for the idea, that is an important signal to catch early.',
    },
    {
      question: 'What should a startup waitlist page include?',
      answer:
        'It should clearly explain the problem, the offer, who it is for, and why someone should sign up now instead of waiting.',
    },
    {
      question: 'Can a waitlist page help with investor conversations?',
      answer:
        'Yes. Even early signup interest can strengthen your story by showing that real people responded to the positioning and offer.',
    },
  ];
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
    createFAQSchema(faqs),
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'BizMap AI', url: '/bizmap-ai' },
      { name: 'Waitlist Maker', url: '/waitlist' },
    ]),
  ];

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
                <span className="takeover-gradient creatives-font">Build Your Waitlist</span>
              </h1>
            </div>

            <WaitlistEditor />

            <div className="mx-auto mt-10 max-w-5xl space-y-8 px-2">
              <AnswerSummary
                title="Why founders use Waitlist Maker"
                description="This section answers the high-intent questions people ask before choosing a startup waitlist tool."
                updatedLabel="March 2026"
                items={[
                  {
                    label: 'What it is for',
                    title: 'Testing demand before building',
                    description:
                      'Waitlist Maker helps you launch a pre-release page that explains the offer clearly and captures early signup intent.',
                  },
                  {
                    label: 'Why it matters',
                    title: 'Real signups are stronger than assumptions',
                    description:
                      'A waitlist helps you see whether your message and offer are strong enough to attract interest before product development is fully underway.',
                  },
                  {
                    label: 'What founders learn',
                    title: 'Whether the positioning is working',
                    description:
                      'You learn if your headline, offer, and audience are resonating, which makes later MVP and launch decisions less risky.',
                  },
                ]}
              />

              <PageFAQSection
                faqs={faqs}
                description="Common founder questions about waitlist pages, demand validation, and pre-launch traction."
              />
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
