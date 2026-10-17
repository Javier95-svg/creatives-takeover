import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import InstitutionContactForm from "@/components/audience/InstitutionContactForm";
import { captureEvent } from "@/lib/analytics";
import { INSTITUTION_PRICING, SALES_DIALOG } from "@/data/pricingPage";

/**
 * The Institutions view of /pricing: no price, a "Talk with sales" pop-up.
 * The form goes through contact-form-submission, which emails
 * admin@creatives-takeover.com on every request and stores the row.
 */
const InstitutionPricing = () => {
  const [salesOpen, setSalesOpen] = useState(false);

  const openSales = (placement: string) => {
    captureEvent("sales_cta_clicked", { placement });
    setSalesOpen(true);
  };

  return (
    <section className="relative pb-section-mobile pt-2 lg:pb-section-desktop" id="institution-pricing">
      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-panel trust-outline relative overflow-hidden rounded-3xl p-8 sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{INSTITUTION_PRICING.eyebrow}</p>
            <h2 className="mt-5 font-space-grotesk text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              {INSTITUTION_PRICING.title}
            </h2>
            <p className="mt-3 max-w-md text-base text-muted-foreground sm:text-lg">{INSTITUTION_PRICING.copy}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={() => openSales("pricing_card")}
                className="h-12 gap-2 rounded-xl bg-gradient-unified px-6 text-base font-semibold text-primary-foreground hover:opacity-90"
              >
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                {INSTITUTION_PRICING.cta}
              </Button>
              <Button asChild variant="outline" size="lg" className="h-12 gap-2 rounded-xl px-6 text-base">
                <Link to={INSTITUTION_PRICING.secondary.href}>
                  {INSTITUTION_PRICING.secondary.label}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="surface-panel rounded-3xl p-8 sm:p-10">
            <p className="font-space-grotesk text-lg font-semibold text-foreground">{INSTITUTION_PRICING.includesTitle}</p>
            <ul className="mt-5 space-y-3.5">
              {INSTITUTION_PRICING.includes.map((item) => (
                <li key={item} className="flex items-start gap-3 text-foreground">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-success/15 p-1 text-success" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-5xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {INSTITUTION_PRICING.stepsTitle}
          </p>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {INSTITUTION_PRICING.steps.map((step, index) => (
              <li key={step.title} className="surface-panel rounded-2xl p-6">
                <span className="gradient-text font-space-grotesk text-3xl font-bold">{index + 1}</span>
                <p className="mt-2 font-space-grotesk text-lg font-semibold text-foreground">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
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
