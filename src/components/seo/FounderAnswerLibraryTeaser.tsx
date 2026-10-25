import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PEDIA_ENTRIES, entryPath, getTopic, type PediaEntry } from "@/data/startupPedia";

// Startup Pedia replaced the Founder Answer Library (2026-10-25). The section,
// its layout and its place on the homepage and /resources are unchanged; only
// the entries it features and the links point at the new library.
const FEATURED_SLUGS = [
  "ideal-customer-profile",
  "how-to-validate-a-startup-idea",
  "minimum-viable-product",
  "go-to-market-strategy",
  "pitch-deck-outline",
];

interface FounderAnswerLibraryTeaserProps {
  compact?: boolean;
}

export default function FounderAnswerLibraryTeaser({ compact = false }: FounderAnswerLibraryTeaserProps) {
  const featuredPages = FEATURED_SLUGS.slice(0, compact ? 3 : 5)
    .map((slug) => PEDIA_ENTRIES.find((entry) => entry.slug === slug))
    .filter((entry): entry is PediaEntry => Boolean(entry));

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
                        {getTopic(page.topic)?.label}
                      </p>
                      <h3 className="mt-1 text-base font-semibold">{page.title}</h3>
                    </div>
                    <Link
                      to={entryPath(page.slug)}
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
