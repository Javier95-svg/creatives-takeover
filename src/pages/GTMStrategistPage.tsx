import { useEffect } from 'react';
import SEO, { createBreadcrumbSchema, createFAQSchema, createSoftwareApplicationSchema } from '@/components/SEO';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import AnswerSummary from '@/components/seo/AnswerSummary';
import PageFAQSection from '@/components/seo/PageFAQSection';
import { Separator } from '@/components/ui/separator';
import { useGTMStrategist } from '@/hooks/useGTMStrategist';
import { useLeanStartupStore } from '@/store/leanStartupStore';
import GTMIntakeForm from '@/components/gtm/GTMIntakeForm';
import GTMAnalysisLoader from '@/components/gtm/GTMAnalysisLoader';
import GTMBriefHeader from '@/components/gtm/GTMBriefHeader';
import GTMBriefSidebar from '@/components/gtm/GTMBriefSidebar';
import GTMChannelCard from '@/components/gtm/GTMChannelCard';
import GTMPositioningBlock from '@/components/gtm/GTMPositioningBlock';
import GTMMessagingBlock from '@/components/gtm/GTMMessagingBlock';
import GTMActionPlan from '@/components/gtm/GTMActionPlan';
import GTMLaunchChecklist from '@/components/gtm/GTMLaunchChecklist';
import GTMMetricsBlock from '@/components/gtm/GTMMetricsBlock';
import GTMStrategistWallpaper from '@/components/wallpapers/GTMStrategistWallpaper';
import { ContextualMentorRecommendations } from '@/components/mentor-marketplace/ContextualMentorRecommendations';

const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Go-To-Market Strategy Generator',
    description: 'Generate go-to-market strategy, messaging, channels, and a 30-day launch plan for your startup.',
    url: 'https://creatives-takeover.com/go-to-market',
  },
  createSoftwareApplicationSchema({
    name: 'GTM Strategist',
    description: 'Go-to-market strategy generator for founders who need channel recommendations, messaging, and launch priorities.',
    url: '/go-to-market',
    featureList: ['channel recommendations', 'positioning', 'messaging', '30-day action plan'],
  }),
  createBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'BizMap AI', url: '/bizmap-ai' },
    { name: 'GTM Strategist', url: '/go-to-market' },
  ]),
];

export default function GTMStrategistPage() {
  const { markToolUsed } = useLeanStartupStore();
  const faqs = [
    {
      question: 'What is a go-to-market strategy for an early-stage startup?',
      answer:
        'A go-to-market strategy is the practical plan for reaching the right customers, explaining the offer clearly, choosing channels, and turning launch activity into early traction.',
    },
    {
      question: 'Does GTM Strategist recommend startup acquisition channels?',
      answer:
        'Yes. It is designed to recommend channels based on your product, audience, and stage so you can focus on the tactics most likely to work first.',
    },
    {
      question: 'Can founders use GTM Strategist before launch?',
      answer:
        'Yes. Pre-launch and first-launch planning are core use cases because the tool helps structure outreach, messaging, and execution before you waste effort on scattered tactics.',
    },
  ];
  const pageStructuredData = [
    ...structuredData,
    createFAQSchema(faqs),
  ];

  useEffect(() => {
    markToolUsed('gtm-strategist');
  }, [markToolUsed]);

  const {
    phase,
    analysis,
    isSaving,
    isExporting,
    prefillData,
    runAnalysis,
    savePlan,
    exportPlan,
    resetToIntake,
  } = useGTMStrategist();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <SEO
        title="Go-To-Market Strategy Generator | Creatives Takeover"
        description="Generate a go-to-market strategy with channel recommendations, positioning, messaging, and a 30-day startup launch plan."
        keywords="go to market strategy generator, startup gtm plan, launch strategy tool, customer acquisition strategy, founder marketing"
        url="/go-to-market"
        structuredData={pageStructuredData}
      />
      <GTMStrategistWallpaper />
      <div className="relative z-10">
        <Navigation />

        <main className="px-4 pt-28 pb-20 md:pt-32 lg:pt-36">
          <div className="container mx-auto max-w-5xl space-y-8">

          <AnswerSummary
            title="How founders use GTM Strategist"
            description="This gives search engines and AI answer tools a clearer, direct explanation of the product and its best use case."
            updatedLabel="March 2026"
            items={[
              {
                label: 'What it does',
                title: 'Turns product thinking into launch planning',
                description:
                  'GTM Strategist converts product context into messaging, channels, launch priorities, and practical acquisition steps.',
              },
              {
                label: 'When to use it',
                title: 'Right before launch or first traction',
                description:
                  'It is most useful once the offer is defined enough that you need a practical plan for who to target, what to say, and where to show up.',
              },
              {
                label: 'What you get',
                title: 'A 30-day plan you can execute',
                description:
                  'The output includes positioning, messaging, recommended channels, and a launch checklist that is meant to be used immediately.',
              },
            ]}
          />

          {/* Phase A — Intake Wizard */}
          {phase === 'intake' && (
            <GTMIntakeForm
              prefillData={prefillData}
              onSubmit={runAnalysis}
              isSubmitting={false}
            />
          )}

          {/* Phase B — Analysis Loading */}
          {phase === 'analyzing' && <GTMAnalysisLoader />}

          {/* Phase C — GTM Brief Results */}
          {phase === 'results' && analysis && (
            <div className="space-y-8">
              <GTMBriefHeader
                planTitle={analysis.planTitle}
                summaryInsight={analysis.summaryInsight}
                isSaving={isSaving}
                isExporting={isExporting}
                onSave={() => savePlan('saved')}
                onExport={exportPlan}
                onRegenerate={resetToIntake}
              />

              <ContextualMentorRecommendations
                track="gtm"
                source="gtm-results"
                targetAudience={analysis.intakeAnswers?.targetAudience}
                summaryInsight={analysis.summaryInsight}
                extraKeywords={[
                  analysis.positioning?.positioningStatement,
                  analysis.messaging?.headline,
                  ...analysis.channels.map((channel) => channel.channel),
                  ...analysis.channels.flatMap((channel) => channel.weekOneActions),
                ].filter(Boolean)}
              />

              <div className="flex gap-8 items-start">
                {/* Sticky sidebar (desktop only) */}
                <GTMBriefSidebar />

                {/* Main content */}
                <div className="flex-1 min-w-0 space-y-12">

                  <section id="channels" className="space-y-4 scroll-mt-6">
                    <h2 className="text-lg font-bold text-muted-foreground uppercase tracking-wider text-xs">
                      Recommended Channels ({analysis.channels.length})
                    </h2>
                    <div className="space-y-4">
                      {analysis.channels.map((ch, i) => (
                        <GTMChannelCard key={ch.channel} channel={ch} rank={i + 1} />
                      ))}
                    </div>
                  </section>

                  <Separator />

                  <section id="positioning" className="scroll-mt-6">
                    <GTMPositioningBlock positioning={analysis.positioning} />
                  </section>

                  <Separator />

                  <section id="messaging" className="scroll-mt-6">
                    <GTMMessagingBlock messaging={analysis.messaging} />
                  </section>

                  <Separator />

                  <section id="action-plan" className="scroll-mt-6">
                    <GTMActionPlan actionPlan={analysis.actionPlan} />
                  </section>

                  <Separator />

                  <section id="checklist" className="scroll-mt-6">
                    <GTMLaunchChecklist checklist={analysis.launchChecklist} />
                  </section>

                  <Separator />

                  <section id="metrics" className="scroll-mt-6">
                    <GTMMetricsBlock metrics={analysis.metrics} />
                  </section>

                  {/* Bottom save CTA */}
                  <div className="flex flex-wrap gap-3 pt-4 pb-8">
                    <button
                      onClick={() => savePlan('saved')}
                      disabled={isSaving}
                      className="flex-1 sm:flex-none px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                      {isSaving ? 'Saving…' : 'Save Plan & Complete Stage V'}
                    </button>
                    <button
                      onClick={exportPlan}
                      disabled={isExporting}
                      className="flex-1 sm:flex-none px-6 py-2.5 border border-border rounded-lg text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
                    >
                      {isExporting ? 'Exporting…' : 'Export PDF'}
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            )}
            <PageFAQSection
              faqs={faqs}
              description="Common founder questions about go-to-market planning, channel choice, and launch execution."
            />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
