import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MONTHLY_FREE_QUOTAS, PLAN_LABELS, PLAN_MONTHLY_CREDITS, PLAN_SEQUENCE } from "@/config/planPermissions";
import { PLAN_PRICING } from "@/config/pricing";
import { PLAN_PACKAGE_PRESENTATION } from "@/config/planPackages";
import { GTM_STRATEGIST_PRICING } from "@/config/gtmStrategist";
import PricingSectionHeader from "@/components/pricing/PricingSectionHeader";

// Every number in these answers comes from config, so the FAQ cannot drift from
// the plan cards (2026-10-17). The refund answer follows Terms section 7.6.

const credits = PLAN_SEQUENCE.map((plan) => `${PLAN_LABELS[plan]} ${PLAN_MONTHLY_CREDITS[plan]}`).join(", ");
const paidPrices = PLAN_SEQUENCE.filter((plan) => PLAN_PRICING[plan].monthly > 0)
  .map((plan) => `${PLAN_LABELS[plan]} $${PLAN_PRICING[plan].monthly}/month or $${PLAN_PRICING[plan].yearly}/year`)
  .join("; ");
const planFit = PLAN_SEQUENCE.map((plan) => `${PLAN_LABELS[plan]} for ${PLAN_PACKAGE_PRESENTATION[plan].bestFor.toLowerCase()}`).join(", ");

const faqs: Array<{ question: string; answer: string; link?: { label: string; to: string } }> = [
  {
    question: "How should I choose a plan?",
    answer: `Pick the plan for where you are now: ${planFit}. You can move up or down whenever your work changes.`,
  },
  {
    question: "What are credits?",
    answer: `Credits pay for the AI work in the platform. Every plan includes a monthly amount: ${credits}. ICP Builder is free on every plan, and PMF Lab, Tech Stack and the Pitch Deck Analyzer each give you the first one free. GTM Strategist uses ${GTM_STRATEGIST_PRICING.creditsPerResearchGeneration} credits per researched generation. The credits section above lists every cost.`,
  },
  {
    question: "Do unused credits roll over?",
    answer: "No. Included credits reset at the start of each billing cycle. If you often run out early, move up a plan or add a top-up pack for that month.",
  },
  {
    question: "Can I change plans later?",
    answer: "Yes. Upgrades apply immediately. Downgrades apply at the next billing cycle, so you keep what you paid for until then.",
  },
  {
    question: "Can I cancel anytime?",
    answer: `Yes, with no lock-in. Your paid access stays active until the end of the current billing period, then your account moves to ${PLAN_LABELS.rookie}.`,
  },
  {
    question: "What happens to my work if I downgrade?",
    answer: "Your work stays. Saved workspaces and past results remain available; only what you can create next follows the limits of your new plan.",
  },
  {
    question: `What's included in ${PLAN_LABELS.rookie}?`,
    answer: `${PLAN_LABELS.rookie} is free forever with ${PLAN_MONTHLY_CREDITS.rookie} credits a month: the core founder tools with standard AI models, the mentor marketplace and discovery call requests, and free co-founder posts. VC Search and Accelerator Hunt are browse only, and you get ${MONTHLY_FREE_QUOTAS.directory_visits.rookie} directory visits a month. Mentor services are paid separately.`,
  },
  {
    question: "How does billing work?",
    answer: `${PLAN_LABELS.starter}, ${PLAN_LABELS.rising} and ${PLAN_LABELS.pro} are billed monthly or yearly: ${paidPrices}. Subscriptions renew automatically until you cancel, and credits and monthly limits reset on your billing date.`,
  },
  {
    question: "Is my payment information secure?",
    answer: "Yes. Payments are processed by Stripe; we never store your card details.",
  },
  {
    question: "Do you offer refunds?",
    answer: "Refunds are provided where the law requires them or where we agree to one. If a charge looks wrong, contact us and we'll review it.",
    link: { label: "Read the Terms of Service", to: "/terms" },
  },
  {
    question: "Do you offer pricing for programs or teams?",
    answer: "Yes. Accelerators, incubators, university programs and other institutions get custom pricing based on the number of startups and the program's length, starting with a 30-day pilot. Switch to Institutions at the top of this page and choose Talk with sales; we reply within 1–2 business days.",
  },
];

const PricingFAQ = () => (
  <section className="relative overflow-hidden py-section-mobile lg:py-section-desktop">
    <div className="container relative z-10 mx-auto px-4 sm:px-6">
      <PricingSectionHeader eyebrow="Questions" title="Pricing FAQ" lede="Billing, credits and switching plans." />

      <div className="mx-auto max-w-3xl rounded-2xl border border-border/60 bg-card/70 px-6 py-2 sm:px-8">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`item-${index}`} id={`pricing-faq-item-${index}`} className="border-border/60 last:border-b-0">
              <AccordionTrigger className="text-left font-space-grotesk text-base text-foreground hover:text-primary sm:text-lg">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-[15px] leading-relaxed text-muted-foreground">
                <p>{faq.answer}</p>
                {faq.link ? (
                  <Link to={faq.link.to} className="mt-3 inline-block font-medium text-primary underline-offset-4 hover:underline">
                    {faq.link.label}
                  </Link>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </section>
);

export default PricingFAQ;
