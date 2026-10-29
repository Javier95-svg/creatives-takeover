import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FEATURED_PEDIA_ENTRIES } from "@/data/startupPedia/featured";

// Startup Pedia replaced the Founder Answer Library (2026-10-25). The section,
// its layout and its place on the homepage and /resources are unchanged; only
// the entries it features and the links point at the new library.

interface FounderAnswerLibraryTeaserProps {
  compact?: boolean;
  /** "home" is the homepage's shelf of article covers; /resources keeps the list. */
  variant?: "list" | "home";
}

// Cover colours for the homepage shelf, one per featured entry.
const COVER_HUES = [
  ["228 90% 62%", "262 83% 64%"],
  ["152 68% 44%", "192 90% 50%"],
  ["24 92% 56%", "330 85% 60%"],
];

export default function FounderAnswerLibraryTeaser({ compact = false, variant = "list" }: FounderAnswerLibraryTeaserProps) {
  const featuredPages = FEATURED_PEDIA_ENTRIES.slice(0, compact ? 3 : 5);

  if (variant === "home") {
    return (
      <section className="section-shell hx-pedia" aria-labelledby="pedia-heading">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="hx-pedia__top">
            <div className="hx-head">
              <p className="homepage-section-badge hx-eyebrow">Startup Pedia</p>
              <h2 id="pedia-heading" className="homepage-section-title hx-title">
                Practical answers for your next decision
              </h2>
            </div>
            <div className="hx-pedia__actions">
              <Link to="/startup-pedia" className="hs-button hs-button--primary">
                Explore Startup Pedia
                <ArrowRight aria-hidden="true" />
              </Link>
              <Link
                to="/icp-builder?utm_source=internal&utm_medium=answer_teaser&utm_campaign=build_icp_free"
                className="hs-button hs-button--ghost"
              >
                Build My ICP Free
              </Link>
            </div>
          </div>

          <div className="hx-pedia__shelf">
            {featuredPages.slice(0, 3).map((page, index) => {
              const [from, to] = COVER_HUES[index % COVER_HUES.length];
              return (
                <Link
                  key={page.slug}
                  to={`/startup-pedia/${page.slug}`}
                  className="hx-pedia__card"
                  style={{ "--cover-from": from, "--cover-to": to } as React.CSSProperties}
                >
                  <span className="hx-pedia__cover" aria-hidden="true">
                    <span className="hx-pedia__cover-topic">{page.topicLabel}</span>
                  </span>
                  <span className="hx-pedia__body">
                    <h3 className="hx-pedia__title">{page.title}</h3>
                    <span className="hx-pedia__read">
                      Read
                      <ArrowUpRight aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={compact ? "py-12" : "py-16 lg:py-20"}>
      <div className="container mx-auto px-4 sm:px-6">
        <div className="rounded-5xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Search className="h-3.5 w-3.5" />
                Startup Pedia
              </div>
              <h2 className="mt-4 font-space-grotesk text-3xl font-semibold tracking-tight sm:text-4xl">
                Practical answers for your next decision
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Explore clear guides for defining your ICP, validating demand, scoping an MVP, planning go-to-market,
                and preparing for fundraising.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link to="/startup-pedia">
                    Explore Startup Pedia
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/icp-builder?utm_source=internal&utm_medium=answer_teaser&utm_campaign=build_icp_free">
                    Build My ICP Free
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              {featuredPages.map((page) => (
                <Card key={page.slug} className="border-border/60 bg-background/70 shadow-none">
                  <CardContent className="flex items-start justify-between gap-4 p-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                        {page.topicLabel}
                      </p>
                      <h3 className="mt-1 text-base font-semibold">{page.title}</h3>
                    </div>
                    <Link
                      to={`/startup-pedia/${page.slug}`}
                      className="mt-1 flex-none text-sm font-semibold text-primary hover:underline"
                    >
                      Read
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
