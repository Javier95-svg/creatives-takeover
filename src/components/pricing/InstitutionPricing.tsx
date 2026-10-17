import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck,
  FileText,
  Flag,
  type LucideIcon,
  MessageSquare,
  RefreshCcw,
  SlidersHorizontal,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InstitutionContactForm from "@/components/audience/InstitutionContactForm";
import { captureEvent } from "@/lib/analytics";
import { INSTITUTION_PRICING, SALES_DIALOG } from "@/data/pricingPage";

// Timeline timing: each step appears as the drawing line reaches its marker.
const STEP_DELAY = 0.7;
const LINE_DURATION = STEP_DELAY * (INSTITUTION_PRICING.steps.length - 1);
const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// One icon per inclusion, so the list reads as distinct things a program gets.
const INCLUDE_ICONS: Record<string, LucideIcon> = {
  pilot: Flag,
  access: Users,
  checkins: CalendarCheck,
  report: FileText,
  setup: SlidersHorizontal,
  after: RefreshCcw,
};

/**
 * The Institutions view of /pricing: no price, a "Talk with sales" pop-up.
 * The form goes through contact-form-submission, which emails
 * admin@creatives-takeover.com on every request and stores the row.
 *
 * Laid out as one quote sheet: what sets the price on the left, what every
 * program includes on the right, and the three steps to a proposal below.
 */
const InstitutionPricing = () => {
  const [salesOpen, setSalesOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const openSales = (placement: string) => {
    captureEvent("sales_cta_clicked", { placement });
    setSalesOpen(true);
  };

  const lastStep = INSTITUTION_PRICING.steps.length - 1;

  return (
    <section className="relative pb-section-mobile pt-2 lg:pb-section-desktop" id="institution-pricing">
      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <article className="surface-panel relative mx-auto grid max-w-5xl overflow-hidden rounded-3xl lg:grid-cols-[1.1fr_0.9fr]">
          {/* A hairline of the brand gradient along the top edge of the sheet. */}
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-gradient-unified opacity-70" />

          <div className="flex flex-col p-7 sm:p-10">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
              {INSTITUTION_PRICING.eyebrow}
            </p>
            <h2 className="mt-5 font-space-grotesk text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {INSTITUTION_PRICING.title}
            </h2>
            <p className="mt-3 max-w-md text-[15px] text-muted-foreground">{INSTITUTION_PRICING.audience}</p>

            <dl className="mt-8 divide-y divide-border/70 border-y border-border/70">
              {INSTITUTION_PRICING.terms.map((term) => (
                <div key={term.label} className="grid grid-cols-[6.5rem_1fr] gap-4 py-3.5 sm:grid-cols-[8rem_1fr]">
                  <dt className="pt-0.5 text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{term.label}</dt>
                  <dd className="text-[15px] font-medium text-foreground">{term.value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <Button
                size="lg"
                onClick={() => openSales("pricing_card")}
                className="h-12 gap-2 rounded-xl px-6 text-base font-semibold"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                {INSTITUTION_PRICING.cta}
              </Button>
              <Link
                to={INSTITUTION_PRICING.secondary.href}
                className="group inline-flex items-center gap-1.5 rounded-md text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {INSTITUTION_PRICING.secondary.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="border-t border-border/70 bg-muted/30 p-7 sm:p-10 lg:border-l lg:border-t-0">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{INSTITUTION_PRICING.includesTitle}</p>
            <ul className="mt-5 space-y-4">
              {INSTITUTION_PRICING.includes.map((item) => {
                const Icon = INCLUDE_ICONS[item.key] ?? Flag;
                return (
                  <li key={item.key} className="flex items-start gap-3.5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-background text-primary">
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="pt-1.5 text-[15px] leading-snug text-foreground">{item.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </article>

        <div className="mx-auto mt-14 max-w-5xl">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{INSTITUTION_PRICING.stepsTitle}</p>
          {/* A connected timeline that plays once in view: a blue line draws
              over the grey track, each step pops in as the line reaches it,
              and the pilot step keeps a soft pulse. Reduced motion shows it
              finished, with no pulse. */}
          <motion.ol
            className="relative mt-6 grid gap-7 sm:grid-cols-3 sm:gap-6"
            initial={reduceMotion ? "shown" : "hidden"}
            whileInView="shown"
            viewport={{ once: true, amount: 0.5 }}
          >
            <span aria-hidden="true" className="absolute bottom-5 left-5 top-5 w-px bg-border sm:hidden" />
            <span aria-hidden="true" className="absolute left-5 top-5 hidden h-px w-[calc(66.667%+1rem)] bg-border sm:block" />
            <motion.span
              aria-hidden="true"
              className="absolute bottom-5 left-5 top-5 w-px origin-top bg-primary sm:hidden"
              variants={{ hidden: { scaleY: 0 }, shown: { scaleY: 1, transition: { duration: LINE_DURATION, ease: "easeInOut" } } }}
            />
            <motion.span
              aria-hidden="true"
              className="absolute left-5 top-5 hidden h-px w-[calc(66.667%+1rem)] origin-left bg-primary sm:block"
              variants={{ hidden: { scaleX: 0 }, shown: { scaleX: 1, transition: { duration: LINE_DURATION, ease: "easeInOut" } } }}
            />
            {INSTITUTION_PRICING.steps.map((step, index) => (
              <motion.li
                key={step.title}
                className="relative flex gap-4 sm:block"
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  shown: { opacity: 1, y: 0, transition: { delay: index * STEP_DELAY, duration: 0.5, ease: EASE_OUT } },
                }}
              >
                <motion.span
                  className={
                    index === lastStep
                      ? "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary font-space-grotesk text-sm font-semibold tabular-nums text-primary-foreground"
                      : "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background font-space-grotesk text-sm font-semibold tabular-nums text-foreground"
                  }
                  variants={{
                    hidden: { scale: 0.4 },
                    shown: { scale: 1, transition: { delay: index * STEP_DELAY, type: "spring", stiffness: 380, damping: 18 } },
                  }}
                >
                  {index === lastStep && !reduceMotion ? (
                    <motion.span
                      aria-hidden="true"
                      className="absolute inset-0 rounded-full bg-primary"
                      variants={{
                        hidden: { opacity: 0, scale: 1 },
                        shown: {
                          opacity: [0, 0.55, 0],
                          scale: [1, 1.9, 1.9],
                          transition: { delay: LINE_DURATION + 0.3, duration: 1.6, ease: "easeOut", repeat: Infinity, repeatDelay: 1.8 },
                        },
                      }}
                    />
                  ) : null}
                  <span className="relative">{index + 1}</span>
                </motion.span>
                <div className="pt-1.5 sm:mt-4 sm:pt-0">
                  <p className="font-space-grotesk text-lg font-semibold text-foreground">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>

      <Dialog open={salesOpen} onOpenChange={setSalesOpen}>
        <DialogContent className="max-h-screen overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-space-grotesk text-2xl">{SALES_DIALOG.title}</DialogTitle>
            <DialogDescription>{SALES_DIALOG.copy}</DialogDescription>
          </DialogHeader>
          <InstitutionContactForm
            audience="pricing"
            defaultOrgType="accelerator"
            submitLabel={SALES_DIALOG.submitLabel}
            variant="plain"
            reason={SALES_DIALOG.reason}
          />
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default InstitutionPricing;
