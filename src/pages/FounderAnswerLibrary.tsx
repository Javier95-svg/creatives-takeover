import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";

import SEO, { createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FOUNDER_ANSWER_CLUSTERS, founderAnswerPages } from "@/data/founderAnswerPages";

export default function FounderAnswerLibrary() {
  const structuredData = [
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Founder Answer Library", url: "/answers" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: "Founder Answer Library",
      description:
        "Practical startup answer pages for founders researching ICP, validation, MVPs, go-to-market, and fundraising.",
      url: "https://creatives-takeover.com/answers",
      hasPart: founderAnswerPages.map((page) => ({
        "@type": "WebPage",
        name: page.title,
        url: `https://creatives-takeover.com/answers/${page.slug}`,
      })),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HomeWallpaper />
      <SEO
        title="Founder Answer Library | Startup Guides"
        description="Searchable startup guides for founders defining an ICP, validating demand, planning an MVP, launching, and preparing for fundraising."
        keywords="startup guides, founder answers, validate startup idea, define ICP, MVP builder, go to market strategy"
        url="/answers"
        structuredData={structuredData}
      />
      <div className="relative z-10">
        <Navigation />
        <main className="container mx-auto px-4 py-24 sm:px-6">
          <section className="mx-auto max-w-4xl text-center">
            <Badge className="border-primary/20 bg-primary/10 text-primary" variant="outline">
              Founder search hub
            </Badge>
            <h1 className="mt-5 font-space-grotesk text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Answers founders search for before they build
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              Practical guides for the moments when you are trying to define the customer, validate demand,
              decide what to build, find users, or prepare for fundraising.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/icp-builder?utm_source=seo&utm_medium=answer_library&utm_campaign=library_hero">
                  Build My ICP Free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/pricing">Compare the founder journey</Link>
              </Button>
            </div>
          </section>

          <section className="mt-16 grid gap-5 lg:grid-cols-5">
            {Object.entries(FOUNDER_ANSWER_CLUSTERS).map(([key, cluster]) => (
              <Link
                key={key}
                to={`/answers/${cluster.pillarSlug}`}
                className="rounded-2xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <Search className="h-5 w-5 text-primary" />
                <h2 className="mt-4 text-base font-semibold">{cluster.label}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{cluster.description}</p>
              </Link>
            ))}
          </section>

          <section className="mt-16 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {founderAnswerPages.map((page) => {
              const cluster = FOUNDER_ANSWER_CLUSTERS[page.cluster];
              return (
                <Card key={page.slug} className="border-border/60 bg-card/85 shadow-sm backdrop-blur">
                  <CardContent className="flex h-full flex-col p-6">
                    <Badge variant="outline" className="w-fit border-primary/20 bg-primary/10 text-primary">
                      {cluster.label}
                    </Badge>
                    <h2 className="mt-4 text-xl font-semibold tracking-tight">{page.title}</h2>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-muted-foreground">{page.summary}</p>
                    <Link
                      to={`/answers/${page.slug}`}
                      className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                    >
                      Read the guide
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
