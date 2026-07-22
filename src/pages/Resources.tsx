import { Link } from "react-router-dom";
import { ArrowRight, Banknote, BookOpen, FlaskConical, Hammer, Megaphone, Target } from "lucide-react";

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import FounderAnswerLibraryTeaser from "@/components/seo/FounderAnswerLibraryTeaser";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { founderAnswerPages } from "@/data/founderAnswerPages";
import { SITE_IDENTITY } from "@/config/siteIdentity";

const CLUSTER_RESOURCES = [
  {
    key: "icp",
    title: "Customer clarity",
    description: "Choose a first customer, painful job, buying trigger, and positioning statement.",
    href: "/answers/how-to-define-icp-for-startup",
    toolHref: "/icp-builder",
    toolLabel: "Open ICP Builder",
    icon: Target,
  },
  {
    key: "validation",
    title: "Demand validation",
    description: "Plan interviews, compare evidence, and decide whether a waitlist or MVP is the right next test.",
    href: "/answers/how-to-validate-startup-idea",
    toolHref: "/pmf-lab",
    toolLabel: "Open PMF Lab",
    icon: FlaskConical,
  },
  {
    key: "build",
    title: "MVP building",
    description: "Reduce scope to one useful outcome and choose a stack that matches what the MVP must prove.",
    href: "/answers/mvp-builder-for-startups",
    toolHref: "/mvp-builder",
    toolLabel: "Open MVP Builder",
    icon: Hammer,
  },
  {
    key: "launch",
    title: "Launch and go-to-market",
    description: "Connect an audience, message, channel, and activation event into a measurable launch plan.",
    href: "/answers/go-to-market-strategy-for-startup",
    toolHref: "/go-to-market",
    toolLabel: "Open GTM Strategist",
    icon: Megaphone,
  },
  {
    key: "fundraising",
    title: "Fundraising preparation",
    description: "Strengthen the pitch narrative, source market claims, and build a relevant investor shortlist.",
    href: "/answers/pitch-deck-feedback-for-startups",
    toolHref: "/insighta",
    toolLabel: "Open Insighta",
    icon: Banknote,
  },
] as const;

const DEEPER_RESOURCES = [
  {
    title: "Complete first-time founder guide",
    description: "A step-by-step path from customer clarity through validation, MVP scope, launch, and fundraising preparation.",
    href: "/startup-guide",
  },
  {
    title: "Founder Answer Library",
    description: `Search all ${founderAnswerPages.length} answer pages by question, keyword, or founder stage.`,
    href: "/answers",
  },
  {
    title: "Startup Newspaper",
    description: "Read longer founder lessons and practical articles, with sources collected for verification where available.",
    href: "/newspaper",
  },
  {
    title: "Platform FAQ",
    description: "Get direct answers about plans, credits, tools, data, and how the guided founder system works.",
    href: "/faq",
  },
] as const;

const Resources = () => {
  const structuredData = [
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Founder Resources", url: "/resources" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${SITE_IDENTITY.baseUrl}/resources#collection`,
      name: "Founder Resources from Creatives Takeover",
      description: "Practical startup guides organized by customer clarity, validation, MVP building, launch, traction, and fundraising preparation.",
      url: `${SITE_IDENTITY.baseUrl}/resources`,
      isPartOf: { "@id": `${SITE_IDENTITY.baseUrl}/#website` },
      publisher: { "@id": `${SITE_IDENTITY.baseUrl}/#organization` },
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: founderAnswerPages.length,
        itemListElement: founderAnswerPages.map((page, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: page.title,
          url: `${SITE_IDENTITY.baseUrl}/answers/${page.slug}`,
        })),
      },
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HomeWallpaper />
      <SEO
        title="Startup Resources for First-Time Founders"
        description="Use 25 practical startup guides, evidence checklists, and connected tools for customer clarity, validation, MVP building, launch, and fundraising preparation."
        keywords="startup resources, founder guides, startup validation guide, MVP guide, go-to-market resources, fundraising preparation"
        url="/resources"
        structuredData={structuredData}
      />
      <div className="relative z-10">
        <Navigation />
        <main>
          <section className="container mx-auto px-4 pb-16 pt-28 text-center sm:px-6 sm:pt-32">
            <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
              {founderAnswerPages.length} practical founder guides
            </Badge>
            <h1 className="mx-auto mt-5 max-w-4xl font-space-grotesk text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Free startup resources organized around your next decision
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-xl">
              Start with the question blocking progress. Each guide gives a direct answer, evidence standard, worked example, checklist, primary references, and a connected tool for taking the next step.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link to="/answers">
                  Search the answer library
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link to="/startup-guide">Follow the complete guide</Link>
              </Button>
            </div>
          </section>

          <section className="container mx-auto px-4 py-14 sm:px-6" aria-labelledby="resource-clusters-heading">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Five founder stages</p>
              <h2 id="resource-clusters-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Choose the evidence you need next
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                These are not generic content categories. Each cluster maps a founder question to an evidence threshold, a decision, and a buildable next action.
              </p>
            </div>

            <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-2 lg:grid-cols-3">
              {CLUSTER_RESOURCES.map((resource) => {
                const Icon = resource.icon;
                const count = founderAnswerPages.filter((page) => page.cluster === resource.key).length;
                return (
                  <Card key={resource.key} className="border-border/60 bg-card/80 shadow-sm backdrop-blur">
                    <CardContent className="flex h-full flex-col p-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div>
                        <Badge variant="secondary">{count} guides</Badge>
                      </div>
                      <h3 className="mt-5 text-xl font-semibold tracking-tight">{resource.title}</h3>
                      <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{resource.description}</p>
                      <div className="mt-6 flex flex-col gap-2">
                        <Button variant="outline" asChild>
                          <Link to={resource.href}>Read the pillar guide</Link>
                        </Button>
                        <Button variant="ghost" asChild>
                          <Link to={resource.toolHref}>
                            {resource.toolLabel}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>

          <FounderAnswerLibraryTeaser />

          <section className="container mx-auto px-4 py-16 sm:px-6" aria-labelledby="deeper-resources-heading">
            <div className="mx-auto max-w-5xl rounded-5xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-10">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-primary/10 p-3 text-primary"><BookOpen className="h-6 w-6" /></div>
                <div>
                  <h2 id="deeper-resources-heading" className="text-3xl font-semibold tracking-tight">Deeper guides and reference pages</h2>
                  <p className="mt-3 leading-relaxed text-muted-foreground">Use these hubs when you need a complete sequence, longer analysis, or a platform-specific answer.</p>
                </div>
              </div>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {DEEPER_RESOURCES.map((resource) => (
                  <Link key={resource.href} to={resource.href} className="group rounded-2xl border border-border/60 bg-background/70 p-5 transition-colors hover:border-primary/40">
                    <h3 className="font-semibold tracking-tight group-hover:text-primary">{resource.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{resource.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default Resources;
