import { Link } from "react-router-dom";
import { ArrowRight, Building2, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductShot } from "@/components/enterprise/EnterpriseVisuals";
import { captureEvent } from "@/lib/analytics";
import cohortProgramShot from "@/assets/enterprise/cohort-program.webp";
import cohortProgramLightShot from "@/assets/enterprise/cohort-program-light.webp";
import "@/components/enterprise/enterprise.css";

// The homepage's one band for programs. Every line comes from copy already
// approved on /enterprise; the screen is the same real program dashboard.
// Laid out like the Startup Pedia teaser so it reads as part of the homepage.

const POINTS = [
  "Every startup’s stage, interviews and check-ins on one screen",
  "We follow up with anyone who goes quiet and send you a short summary",
  "A cohort report at day 30, written from recorded work",
];

const trackClick = (placement: string) => () =>
  captureEvent("home_programs_band_clicked", { placement });

export default function HomeProgramsBand() {
  return (
    <section className="py-12 lg:py-16" aria-labelledby="home-programs-heading">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="rounded-5xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Building2 className="h-3.5 w-3.5" />
                For incubators, accelerators and universities
              </div>
              <h2 id="home-programs-heading" className="mt-4 font-space-grotesk text-3xl font-semibold tracking-tight sm:text-4xl">
                See which startups in your cohort are doing the work.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
                Start with a 30-day validation pilot for 5–10 startups. We run it with your team, and founders keep
                their account and their work afterwards.
              </p>
              <ul className="mt-5 space-y-2.5">
                {POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-foreground sm:text-base">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    {point}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild>
                  <Link to="/enterprise" onClick={trackClick("how_it_works")}>
                    See how the pilot works
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/enterprise#talk" onClick={trackClick("book_call")}>
                    Book a pilot call
                  </Link>
                </Button>
              </div>
            </div>
            <div className="ent min-w-0">
              <ProductShot
                src={cohortProgramShot}
                lightSrc={cohortProgramLightShot}
                width={1176}
                height={955}
                title="Program dashboard"
                fade={false}
                alt="The program dashboard for five startups: customer profiles ready, median interviews, experiments run, check-ins this week and startups that need attention, then one row per startup with stage, tasks, interviews, evidence, experiments, last activity and check-in."
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
