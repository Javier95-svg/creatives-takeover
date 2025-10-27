import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Laboratory = () => {
  const canonical = "/laboratory";

  return (
    <>
      <Helmet>
        <title>Creatives Takeover</title>
        <meta
          name="description"
          content="Market research hub with real-time trends, competitive analysis, and demand insights to evaluate business ideas with confidence."
        />
        <meta name="keywords" content="market research, trends, competitive analysis, consumer demand, idea validation, industry insights" />
        <meta property="og:title" content="Laboratory | Real-Time Market Research Hub" />
        <meta property="og:description" content="Explore up-to-date trends, emerging opportunities, and competitive insights to validate and refine your business ideas." />
        <link rel="canonical" href={canonical} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />

        <header className="pt-24 pb-10 border-b border-border">
          <div className="container mx-auto px-6">
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Laboratory: Real-Time Market Research Hub</h1>
            <p className="mt-4 text-muted-foreground max-w-3xl">
              Your dedicated space to explore trending industries, emerging opportunities, and shifting consumer demands. Use curated insights to quickly
              evaluate the potential of your ideas and decide whether to pursue, refine, or pivot.
            </p>
          </div>
        </header>

        <main className="container mx-auto px-6 py-10">
          <section aria-labelledby="trends" className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle id="trends">Trending Industries</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Stay on top of fast-growing sectors with curated signals (funding velocity, hiring momentum, search demand, and adoption curves).
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>AI-native SaaS and agent ecosystems</li>
                  <li>Vertical automation (legal ops, healthcare admin, logistics)</li>
                  <li>Creator economy tools and knowledge products</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Emerging Opportunities</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Spot under-served niches and workflow gaps through pattern-matching across product launches, developer activity, and user pain signals.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Automation in SMB back office and procurement</li>
                  <li>Privacy-first AI copilots and enterprise compliance</li>
                  <li>Thin-UI tools for solopreneurs and agencies</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Consumer Demand Shifts</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Track sentiment, willingness-to-pay, and behavior changes from public signals and community feedback to inform positioning and pricing.
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Value over novelty: clear ROI beats feature bloat</li>
                  <li>Time-to-outcome as a key purchase driver</li>
                  <li>Trust and data control as differentiators</li>
                </ul>
              </CardContent>
            </Card>
          </section>

          <section aria-labelledby="competitive" className="mt-12 grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle id="competitive">Competitive Analysis</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-3">
                <p>
                  Map competitors, alternatives, and substitutes. Compare positioning, pricing models, distribution, and moats to uncover angles for entry.
                </p>
                <p className="text-xs">Note: Data sources are curated and refreshed regularly; always validate before committing resources.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Idea Evaluator</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Use this checklist to pre-validate ideas in minutes before deeper research:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Clear pain with frequent trigger and budget owner</li>
                  <li>Demonstrable 10x improvement on time or cost</li>
                  <li>Reachable niche with repeatable channels</li>
                  <li>Low switching friction or strong wedge</li>
                </ul>
              </CardContent>
            </Card>
          </section>
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Laboratory;
