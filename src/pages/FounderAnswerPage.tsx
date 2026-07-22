import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";

import SEO, { createBreadcrumbSchema, createFAQSchema, createHowToSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import HomeWallpaper from "@/components/wallpapers/HomeWallpaper";
import AnswerSummary from "@/components/seo/AnswerSummary";
import PageFAQSection from "@/components/seo/PageFAQSection";
import RelatedPageLinks from "@/components/seo/RelatedPageLinks";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FOUNDER_ANSWER_CLUSTERS,
  getFounderAnswerPage,
  getRelatedFounderAnswerPages,
} from "@/data/founderAnswerPages";
import { getFounderAnswerEvidence } from "@/data/founderAnswerEvidence";
import { SITE_AUTHOR, SITE_IDENTITY } from "@/config/siteIdentity";

// Convert a human "Month YYYY" label into an ISO date for schema freshness signals.
const MONTHS: Record<string, string> = {
  january: "01", february: "02", march: "03", april: "04", may: "05", june: "06",
  july: "07", august: "08", september: "09", october: "10", november: "11", december: "12",
};
function updatedLabelToIso(label: string): string {
  const match = /([a-zA-Z]+)\s+(\d{4})/.exec(label || "");
  if (match) {
    const month = MONTHS[match[1].toLowerCase()];
    if (month) return `${match[2]}-${month}-01`;
  }
  return new Date().toISOString().split("T")[0];
}

export default function FounderAnswerPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? getFounderAnswerPage(slug) : null;

  if (!page) {
    return <Navigate to="/answers" replace />;
  }

  const cluster = FOUNDER_ANSWER_CLUSTERS[page.cluster];
  const evidence = getFounderAnswerEvidence(page.cluster);
  const relatedPages = getRelatedFounderAnswerPages(page);
  const updatedIso = updatedLabelToIso(page.updatedLabel);
  const schemaSteps = [
    ...page.sections,
    { title: evidence.heading, description: evidence.introduction },
    {
      title: "Evidence checks and next actions",
      description: evidence.checks
        .map((check) => `${check.signal}: ${check.evidence} Next action: ${check.nextAction}`)
        .join(" "),
    },
    { title: evidence.exampleTitle, description: evidence.example },
    { title: "Common false positives to avoid", description: evidence.failureModes.join(" ") },
  ];
  const structuredData = [
    createBreadcrumbSchema([
      { name: "Home", url: "/" },
      { name: "Founder Answer Library", url: "/answers" },
      { name: page.title, url: `/answers/${page.slug}` },
    ]),
    createHowToSchema({
      name: page.title,
      description: page.summary,
      steps: schemaSteps,
      url: `/answers/${page.slug}`,
    }),
    createFAQSchema(page.faqs),
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: page.title,
      description: page.metaDescription,
      datePublished: updatedIso,
      dateModified: updatedIso,
      author: {
        "@type": "Person",
        "@id": `${SITE_IDENTITY.baseUrl}/about#founder`,
        name: SITE_AUTHOR.name,
        jobTitle: SITE_AUTHOR.jobTitle,
        url: SITE_AUTHOR.url,
      },
      publisher: {
        "@type": "Organization",
        name: SITE_IDENTITY.name,
        logo: {
          "@type": "ImageObject",
          url: SITE_IDENTITY.logoUrl,
        },
      },
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `https://creatives-takeover.com/answers/${page.slug}`,
      },
      keywords: [page.keyword, cluster.label, "startup founder guide", "Creatives Takeover"],
      citation: evidence.sources.map((source) => source.url),
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      <HomeWallpaper />
      <SEO
        title={page.metaTitle}
        description={page.metaDescription}
        keywords={`${page.keyword}, ${cluster.label}, startup guide, founder guide, Creatives Takeover`}
        url={`/answers/${page.slug}`}
        type="article"
        author={SITE_AUTHOR.name}
        publishedTime={updatedIso}
        structuredData={structuredData}
      />
      <div className="relative z-10">
        <Navigation />
        <main className="container mx-auto px-4 py-24 sm:px-6">
          <article className="mx-auto max-w-5xl">
            <header className="mx-auto max-w-4xl text-center">
              <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                {cluster.label}
              </Badge>
              <h1 className="mt-5 font-space-grotesk text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
                {page.title}
              </h1>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                {page.summary}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
                <span>
                  By{" "}
                  <Link to="/about#founder" className="font-medium text-foreground underline-offset-4 hover:underline">
                    {SITE_AUTHOR.name}, {SITE_AUTHOR.jobTitle}
                  </Link>
                </span>
                <span aria-hidden="true">/</span>
                <span>Search intent: {page.searchIntent}</span>
                <span aria-hidden="true">/</span>
                <span>Published {page.updatedLabel}</span>
              </div>
            </header>

            <div className="mt-12">
              <AnswerSummary
                eyebrow="Founder quick answer"
                title={page.keyword}
                description={page.summary}
                items={page.quickAnswerItems}
                updatedLabel={page.updatedLabel}
              />
            </div>

            <section className="mt-10 grid gap-5 md:grid-cols-3">
              {page.sections.map((section, index) => (
                <Card id={`step-${index + 1}`} key={section.title} className="scroll-mt-24 border-border/60 bg-card/80 shadow-sm backdrop-blur">
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold tracking-tight">{section.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{section.description}</p>
                  </CardContent>
                </Card>
              ))}
            </section>

            <section id="step-4" className="mt-10 scroll-mt-24 rounded-5xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Evidence standard</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{evidence.heading}</h2>
              <p className="mt-4 max-w-4xl leading-relaxed text-muted-foreground">{evidence.introduction}</p>

              <div id="step-5" className="mt-7 scroll-mt-24 overflow-hidden rounded-2xl border border-border/60">
                <div className="hidden grid-cols-[0.7fr_1.2fr_1fr] gap-4 bg-muted/60 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid">
                  <span>Signal</span>
                  <span>Evidence to record</span>
                  <span>Next action</span>
                </div>
                {evidence.checks.map((check) => (
                  <div key={check.signal} className="grid gap-2 border-t border-border/60 px-5 py-5 first:border-t-0 md:grid-cols-[0.7fr_1.2fr_1fr] md:gap-4">
                    <h3 className="font-semibold text-foreground">{check.signal}</h3>
                    <p className="text-sm leading-relaxed text-muted-foreground">{check.evidence}</p>
                    <p className="text-sm leading-relaxed text-muted-foreground">{check.nextAction}</p>
                  </div>
                ))}
              </div>

              <div className="mt-7 grid gap-5 lg:grid-cols-2">
                <div id="step-6" className="scroll-mt-24 rounded-2xl bg-primary/10 p-6">
                  <h3 className="text-lg font-semibold tracking-tight">{evidence.exampleTitle}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{evidence.example}</p>
                </div>
                <div id="step-7" className="scroll-mt-24 rounded-2xl bg-muted/50 p-6">
                  <h3 className="text-lg font-semibold tracking-tight">Common false positives to avoid</h3>
                  <ul className="mt-3 space-y-3 text-sm leading-relaxed text-muted-foreground">
                    {evidence.failureModes.map((failureMode) => (
                      <li key={failureMode} className="flex gap-3">
                        <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-primary" />
                        <span>{failureMode}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>

            <section className="mt-10 rounded-5xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
              <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                    Founder checklist
                  </p>
                  <h2 className="mt-3 text-2xl font-semibold tracking-tight">Before you move to the next step</h2>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {page.checklist.map((item) => (
                      <div key={item} className="flex gap-3 rounded-2xl bg-background/70 p-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                        <span className="text-sm leading-relaxed text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-primary/20 bg-primary/10 p-6">
                  <p className="text-sm font-semibold text-primary">Turn the answer into action</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight">{page.cta.label}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{page.cta.description}</p>
                  <Button asChild className="mt-5 w-full">
                    <Link to={page.cta.href}>
                      {page.cta.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </section>

            <div className="mt-10">
              <PageFAQSection
                title="Founder questions"
                description="Short answers for founders deciding what to do next."
                faqs={page.faqs}
              />
            </div>

            <section className="mt-10 rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8" aria-labelledby="answer-sources-heading">
              <h2 id="answer-sources-heading" className="text-2xl font-semibold tracking-tight">Sources and further reading</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Primary references used to ground this framework. Creatives Takeover adds the operating examples and founder checklist above.
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {evidence.sources.map((source) => (
                  <li key={source.url}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-full items-start justify-between gap-3 rounded-2xl border border-border/60 bg-background/70 p-4 text-sm transition-colors hover:border-primary/40"
                    >
                      <span>
                        <span className="block font-semibold text-foreground">{source.title}</span>
                        <span className="mt-1 block text-muted-foreground">{source.publisher}</span>
                      </span>
                      <ExternalLink className="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <RelatedPageLinks
              title="Keep learning"
              links={[
                ...relatedPages.map((related) => ({
                  href: `/answers/${related.slug}`,
                  label: related.title,
                })),
                { href: "/answers", label: "Founder Answer Library" },
              ]}
            />
          </article>
        </main>
        <Footer />
      </div>
    </div>
  );
}
