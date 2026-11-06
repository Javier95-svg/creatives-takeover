import { Link } from "react-router-dom";
import { ArrowRight, Check, IdCard as IdCardIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IdCard } from "@/components/founder-id/IdCard";
import { captureEvent } from "@/lib/analytics";
import { FOUNDER_ID_EXAMPLE_CARDS, FOUNDER_ID_HERO, FOUNDER_ID_PATH } from "@/data/founderIdPage";
import "@/components/founder-id/founder-id.css";

// A short homepage promo for Founder ID, laid out like the programs band and
// the Startup Pedia teaser. Copy comes from the approved /founder-id page
// (src/data/founderIdPage.ts); the card is one of its example cards.

const POINTS = [
  "A clean preview card when you share it on LinkedIn or X",
  "Project links, progress updates and a way for people to support you",
  "A permanent founder number, given in the order people join",
];

const example = FOUNDER_ID_EXAMPLE_CARDS[0];

export default function HomeFounderIdBand() {
  return (
    <section className="py-12 lg:py-16" aria-labelledby="home-founder-id-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="rounded-5xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <IdCardIcon className="h-3.5 w-3.5" />
                {FOUNDER_ID_HERO.eyebrow}
              </div>
              <h2 id="home-founder-id-heading" className="mt-4 font-space-grotesk text-3xl font-semibold tracking-tight sm:text-4xl">
                {FOUNDER_ID_HERO.titleLead} {FOUNDER_ID_HERO.titleAccent}
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Your public page on Creatives Takeover: your project, your links and your latest progress at
                creatives-takeover.com/@yourname, ready for your bio, pitch deck and email signature.
              </p>
              <ul className="mt-5 space-y-2.5">
                {POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-foreground sm:text-base">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild>
                  <Link to={FOUNDER_ID_PATH} onClick={() => captureEvent("home_founder_id_band_clicked", { placement: "primary" })}>
                    {FOUNDER_ID_HERO.primaryCta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <span className="text-sm text-muted-foreground">{FOUNDER_ID_HERO.note}</span>
              </div>
            </div>
            <figure className="m-0 px-2 sm:px-6">
              <IdCard
                person={example}
                label={`Example Founder ID card: ${example.name}, @${example.handle}, founder number ${example.number}, ${example.stage} stage, building ${example.tagline.toLowerCase()}.`}
              />
              <figcaption className="mt-5 text-center text-xs uppercase tracking-[0.18em] text-muted-foreground">
                Example card
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
