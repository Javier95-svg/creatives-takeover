import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, IdCard as IdCardIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { IdCard, type IdCardPerson } from "@/components/founder-id/IdCard";
import { captureEvent } from "@/lib/analytics";
import { FOUNDER_ID_HERO, FOUNDER_ID_PATH } from "@/data/founderIdPage";
import "@/components/founder-id/founder-id.css";
import "./home-founder-id.css";

// A short homepage promo for Founder ID, laid out like the programs band and
// the Startup Pedia teaser. Copy comes from the approved /founder-id page.
// The card design is fixed (api/_founder-id-card.tsx), so the deck shows what a
// founder really sets: name, @handle, project and stage, which can be hidden.

// Ordinary names and handles, checked against profiles on 2026-11-06 so none
// of them belongs to a real account.
const EXAMPLES: IdCardPerson[] = [
  { name: "Amara Okafor", handle: "amaraokafor", number: "000 208", stage: "Validation", tagline: "Bookkeeping for food trucks" },
  { name: "Lucas Ferreira", handle: "lucasferreira", number: "000 562", stage: "Building", tagline: "Language lessons for nurses" },
  { name: "Mei Tanaka", handle: "meitanaka", number: "001 093", stage: "Launch", tagline: "Repair tracking for phone shops" },
  { name: "Omar Haddad", handle: "omarhaddad", number: "000 874", stage: null, tagline: "Shift swaps for hospital staff" },
];

const FIELDS = ["Your name", "@handle", "Photo", "What you’re building", "Stage, or keep it private"];

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const track = (placement: string) => () => captureEvent("home_founder_id_band_clicked", { placement });

export default function HomeFounderIdBand() {
  const [front, setFront] = useState(0);
  const count = EXAMPLES.length;
  const current = EXAMPLES[front];

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") setFront((value) => (value + 1) % count);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [count]);

  return (
    <section className="py-12 lg:py-16" aria-labelledby="home-founder-id-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="home-fid rounded-5xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8 lg:p-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <IdCardIcon className="h-3.5 w-3.5" />
                {FOUNDER_ID_HERO.eyebrow}
              </div>
              <h2 id="home-founder-id-heading" className="mt-4 font-space-grotesk text-3xl font-semibold tracking-tight sm:text-4xl">
                {FOUNDER_ID_HERO.titleLead} {FOUNDER_ID_HERO.titleAccent}
              </h2>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Every ID contains
              </p>
              <ul className="mt-3 flex flex-wrap gap-2" aria-label="What every Founder ID contains">
                {FIELDS.map((field) => (
                  <li key={field} className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-sm text-foreground">
                    {field}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                Your founder number is permanent, given in the order people join.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild>
                  <Link to={FOUNDER_ID_PATH} onClick={track("primary")}>
                    {FOUNDER_ID_HERO.primaryCta}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={FOUNDER_ID_PATH} onClick={track("preview")}>
                    See your card first
                  </Link>
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{FOUNDER_ID_HERO.note}</p>
            </div>

            <figure className="m-0">
              <div className="fid-stage home-fid__stage">
                <div className="fid-deck">
                  {EXAMPLES.map((person, index) => {
                    const position = (index - front + count) % count;
                    return (
                      <button
                        key={person.handle}
                        type="button"
                        className="fid-deck__slot home-fid__slot"
                        data-pos={position}
                        onClick={() => setFront(index)}
                        aria-label={`Show ${person.name}'s example card`}
                        aria-pressed={position === 0}
                        tabIndex={position === 0 ? -1 : 0}
                      >
                        <IdCard
                          person={person}
                          label={`Example Founder ID card: ${person.name}, @${person.handle}, founder number ${person.number}${person.stage ? `, ${person.stage} stage` : ", stage kept private"}, building ${person.tagline?.toLowerCase()}.`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="fid-stage__floor" aria-hidden="true" />
              </div>
              <figcaption className="mt-10 text-center text-sm text-muted-foreground" aria-live="polite">
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">Example card</span>
                <span className="mx-2" aria-hidden="true">·</span>
                {current.name}, {current.tagline}
                {current.stage ? `, ${current.stage.toLowerCase()} stage` : ", stage kept private"}
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
