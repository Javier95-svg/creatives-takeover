import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import VCSearchTab from "@/components/insighta/VCSearchTab";
import EmailTemplatesTab from "@/components/insighta/EmailTemplatesTab";
import AcceleratorHuntTab from "@/components/insighta/AcceleratorHuntTab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, BarChart3, Mail, Presentation, Rocket, Users } from "lucide-react";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { InsightaPipelinePanel } from "@/components/insighta/InsightaPipelinePanel";
import { useInsightaPipeline } from "@/hooks/useInsightaPipeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getFounderTool } from "@/config/founderToolCatalog";

// Insighta: VC Search, Email Templates, Accelerator Hunt - v1.0
interface BlogProps {
  defaultTab?: 'vc-search' | 'email-templates' | 'accelerator-hunt';
}

const Blog = ({ defaultTab = 'vc-search' }: BlogProps) => {
  const { trackPageVisit } = useReadingAnalytics();
  const [searchParams] = useSearchParams();
  const pipeline = useInsightaPipeline();
  const tractionTool = getFounderTool('traction_engine');
  const readinessTool = getFounderTool('insighta_test');
  const pitchTool = getFounderTool('pitch_deck_analyzer');

  // Get tab from URL query parameter or use defaultTab prop
  const tabFromUrl = searchParams.get('tab') || defaultTab;
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);

  // Update active tab when URL changes or defaultTab changes
  useEffect(() => {
    const tab = searchParams.get('tab') || defaultTab;
    if (['vc-search', 'email-templates', 'accelerator-hunt'].includes(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams, defaultTab]);

  // Track page visit when component mounts
  useEffect(() => {
    trackPageVisit('Insighta');
  }, [trackPageVisit]);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "Insighta — Traction and Optional Fundraising",
      "description": "Measure traction, improve investor readiness, research relevant prospects, and continue outreach without implying funding is guaranteed.",
      "url": "https://creatives-takeover.com/insighta",
      "publisher": {
        "@type": "Organization",
        "name": "Creatives Takeover",
        "logo": {
          "@type": "ImageObject",
          "url": "https://creatives-takeover.com/favicon.png"
        }
      }
    },
    createBreadcrumbSchema([
      { name: 'Home', url: '/' },
      { name: 'Insighta', url: '/insighta' }
    ])
  ];

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Insighta: Traction & Fundraising Readiness | Creatives Takeover"
        description="Run attributed traction sprints first, then use optional fundraising readiness, deck analysis, investor research, and outreach workflows."
        keywords="startup traction engine, fundraising readiness, investor outreach tools, vc search, pitch deck analysis"
        url="/insighta"
        structuredData={structuredData}
      />
      <Navigation />

      <main>
        <section className="container mx-auto px-4 pb-8 pt-28">
          <div className="text-center mb-8">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Insighta · Stages VI–VII</p>
                  <h1 className="font-space-grotesk text-4xl sm:text-5xl font-semibold tracking-tight gradient-text mb-4">
                    Turn launch activity into evidence.
                  </h1>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Traction is the core outcome. Fundraising becomes an optional workflow when your evidence and timing support it.
            </p>
          </div>

          <Card className="mb-10 border-primary/25 bg-primary/[0.04]">
            <CardContent className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><BarChart3 className="h-5 w-5" /></span>
                  <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Stage VI · Core</p><h2 className="text-xl font-semibold">{tractionTool.name}</h2></div>
                </div>
                <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">{tractionTool.purpose} The outcome is a measured double-down, iterate, or kill decision—not a vanity score.</p>
                <p className="mt-2 text-xs text-muted-foreground"><span className="font-medium text-foreground">Promised artifact:</span> {tractionTool.promisedArtifact}</p>
              </div>
              <Button asChild><Link to={tractionTool.route}>Open Traction Engine<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
            </CardContent>
          </Card>

          <div className="mb-8 grid gap-4 md:grid-cols-2">
            <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Stage VII · Optional</p><div className="mt-2 flex items-center gap-2"><BarChart3 className="h-4 w-4 text-primary" /><h2 className="font-semibold">{readinessTool.name}</h2></div><p className="mt-2 text-sm text-muted-foreground">{readinessTool.purpose}</p><Button asChild variant="outline" size="sm" className="mt-4"><Link to={readinessTool.route}>Diagnose readiness</Link></Button></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Stage VII · Optional</p><div className="mt-2 flex items-center gap-2"><Presentation className="h-4 w-4 text-primary" /><h2 className="font-semibold">{pitchTool.name}</h2></div><p className="mt-2 text-sm text-muted-foreground">{pitchTool.purpose}</p><Button asChild variant="outline" size="sm" className="mt-4"><Link to={pitchTool.route}>Review pitch deck</Link></Button></CardContent></Card>
          </div>

          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Optional fundraising pipeline</p>
            <h2 className="mt-1 text-2xl font-semibold">Research, save, and continue outreach</h2>
            <p className="mt-2 text-sm text-muted-foreground">Editable filters and saved prospects remain in your control. Insighta measures actions, replies, and meetings—never guaranteed funding.</p>
          </div>

          {pipeline.isAuthenticated && (
            <InsightaPipelinePanel
              items={pipeline.items}
              loading={pipeline.loading}
              pending={pipeline.pending}
              onUpdate={pipeline.updateItem}
              onRemove={pipeline.removeItem}
            />
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="adaptive-tabs grid w-full grid-cols-3 mb-8 rounded-full border border-border/70 bg-muted/40 p-1 shadow-sm">
              <TabsTrigger value="vc-search" className="flex items-center gap-2 rounded-full data-[state=active]:shadow-md">
                <Users className="h-4 w-4" />
                <span>VC Search</span>
              </TabsTrigger>
              <TabsTrigger value="email-templates" className="flex items-center gap-2 rounded-full data-[state=active]:shadow-md">
                <Mail className="h-4 w-4" />
                <span>Email Templates</span>
              </TabsTrigger>
              <TabsTrigger value="accelerator-hunt" className="flex items-center gap-2 rounded-full data-[state=active]:shadow-md">
                <Rocket className="h-4 w-4" />
                <span>Accelerator Hunt</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vc-search">
              <VCSearchTab />
            </TabsContent>

            <TabsContent value="email-templates">
              <EmailTemplatesTab />
            </TabsContent>

            <TabsContent value="accelerator-hunt">
              <AcceleratorHuntTab />
            </TabsContent>
          </Tabs>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Blog;
