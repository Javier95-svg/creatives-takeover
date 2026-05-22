import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsDown, ThumbsUp } from "lucide-react";

const PricingFAQ = () => {
  const [helpfulVotes, setHelpfulVotes] = useState<Record<number, "up" | "down" | null>>({});
  const [openItem, setOpenItem] = useState<string | undefined>();

  const faqs = [
    {
      question: "Can I change plans later?",
      answer: `Yes. You can move between Rookie, Starter, Rising, and Pro whenever your workflow changes.

    Upgrades unlock the new plan immediately. Downgrades take effect on the next billing cycle so you keep the access, credits, and limits you already paid for until that cycle ends.`,
      relatedQuestions: [1, 3],
    },
    {
      question: "What are credits and how do they work?",
      answer: `Credits are the usage currency for the AI-powered parts of the platform. Every plan includes a monthly credit grant: Rookie gets 50, Starter 100, Rising 250, and Pro 600.

    Waitlist Maker is unlocked on every plan and uses credits: 4 credits on Rookie and 3 credits on paid plans. PMF Lab unlocks on Starter and above and uses credits for analyses. Rising and Pro unlock MVP Builder, Tech Stack Builder, GTM Strategist, and Pitch Deck Analyzer; MVP Builder charges per AI action because it behaves like a vibe coding workspace.

    ICP Builder stays free across all four plans. Discovery Calls are monthly quotas: Rookie includes 1 per month, Starter 2, Rising 3, and Pro includes unlimited discovery calls.`,
      relatedQuestions: [0, 5],
    },
    {
      question: "How should I choose the right plan?",
      answer: `Think about your founder stage, not just the credit number.

Rookie helps you clarify your ICP and first traction asset. Starter is for validating demand with PMF Lab, Email Templates, and more research/community access. Rising is for building and launching with MVP Builder, Tech Stack Builder, GTM Strategist, Directories, and Pitch Deck Analyzer. Pro is for fundraising and scaling with Find Your Angel, unlimited research views, unlimited discovery calls, and the largest credit runway.`,
      relatedQuestions: [1, 6],
    },
    {
      question: "Do unused credits roll over to the next month?",
      answer: `No. Included monthly credits reset on your billing-cycle boundary and do not roll over.

If you routinely run out before the cycle ends, that usually means you should move up a plan or add credit packs for heavier execution windows.`,
      relatedQuestions: [0, 1],
    },
    {
      question: "Do you offer refunds?",
      answer: `Paid subscriptions are covered by our standard refund policy. If you need help with a charge or believe something is wrong with billing, contact support and we will review it quickly.

The important operational detail is that plan upgrades, renewals, and billing-cycle timing all flow through Stripe.`,
      relatedQuestions: [3, 4],
    },
    {
      question: "Can I cancel anytime?",
      answer: `Yes. There is no long-term lock-in.

If you cancel, your paid access stays active until the end of the current billing period and then your account falls back to Rookie.`,
      relatedQuestions: [0, 2],
    },
    {
      question: "Is my payment information secure?",
      answer: `Yes. Payments are processed through Stripe and we do not store raw card details on our servers.

That means billing, renewals, and checkout security all run on Stripe's infrastructure rather than custom payment handling inside the product.`,
      relatedQuestions: [6],
    },
    {
      question: "What's included in the Rookie plan?",
      answer: `Rookie is free forever and includes 50 credits per month. You get Dashboard Rookie Mode, ICP Builder for free, Waitlist Maker with credit usage, Prompt Library access for free models only, Insighta Test, Newspaper, 1 discovery call per month, and 1 Find a Co-Founder post per month.

    VC Search and Accelerator Hunt are browse only on Rookie. PMF Lab, MVP Builder, Tech Stack Builder, GTM Strategist, and Directories stay in preview only, and Find Your Angel is not included. Email Templates and Pitch Deck Analyzer are also not included on Rookie.`,
      relatedQuestions: [0, 1],
    },
    {
      question: "What happens to my data if I downgrade?",
      answer: `Downgrading changes what you can create next, not whether your existing work still exists.

    You keep your prior data, but any plan-locked actions follow the limits of your new tier. For example, moving from Rising to Starter drops VC Search and Accelerator Hunt to 2 profile views per month, removes Pitch Deck Analyzer access, and returns MVP Builder, Tech Stack Builder, GTM Strategist, and Directories to preview-only access.`,
      relatedQuestions: [0, 3],
    },
    {
      question: "How does billing work?",
      answer: `You can choose monthly or yearly billing on Starter, Rising, and Pro. The current prices are Starter at $9/month or $79/year, Rising at $29/month or $239/year, and Pro at $65/month or $589/year.

    Your subscription renews automatically until you cancel. Included credits, profile-view limits, and quota-limited actions reset on the same billing-cycle anchor rather than a generic calendar month.`,
      relatedQuestions: [4, 0],
    },
    {
      question: "Can I get a custom plan for my team?",
      answer: `Yes. If your team needs custom credit allocations, more seats, or a different support model, contact us directly.

The default self-serve offering now centers on Rookie, Starter, Rising, and Pro, but larger team setups can still be scoped separately.`,
      relatedQuestions: [0, 6],
    },
  ];

  const handleVote = (index: number, vote: "up" | "down") => {
    setHelpfulVotes((prev) => ({
      ...prev,
      [index]: prev[index] === vote ? null : vote,
    }));
  };

  const handleRelatedQuestionClick = (relatedIndex: number) => {
    setOpenItem(`item-${relatedIndex}`);

    if (typeof document !== "undefined") {
      requestAnimationFrame(() => {
        document
          .getElementById(`pricing-faq-item-${relatedIndex}`)
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  };

  return (
    <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-8 pb-2 gradient-text font-space-grotesk">
            Pricing FAQ
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Clear answers on pricing, billing cycles, credits, and what changes between Rookie, Starter, Rising, and Pro.
          </p>
        </div>

        <Card className="max-w-4xl mx-auto rounded-2xl bg-card/80 backdrop-blur-sm border-border/60 p-8 animate-fade-in shadow-xl">
          <Accordion type="single" collapsible value={openItem} onValueChange={setOpenItem} className="w-full">
            {faqs.map((faq, index) => {
              const vote = helpfulVotes[index];

              return (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  id={`pricing-faq-item-${index}`}
                  className="border-border/60"
                >
                  <AccordionTrigger className="text-left text-foreground hover:text-primary font-space-grotesk text-base sm:text-lg">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-4">
                    <div className="space-y-3">
                      {faq.answer.split("\n\n").map((paragraph, pIndex) => (
                        <p key={pIndex}>{paragraph.trim()}</p>
                      ))}
                    </div>

                    <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                      <span className="text-sm text-muted-foreground">Was this helpful?</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(index, "up")}
                          className={`h-9 w-9 rounded-full border border-border/60 ${vote === "up" ? "text-green-600" : ""}`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(index, "down")}
                          className={`h-9 w-9 rounded-full border border-border/60 ${vote === "down" ? "text-red-600" : ""}`}
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {faq.relatedQuestions && faq.relatedQuestions.length > 0 && (
                      <div className="pt-4">
                        <p className="text-sm font-medium text-foreground mb-2">Related questions:</p>
                        <div className="flex flex-wrap gap-2">
                          {faq.relatedQuestions.map((relatedIndex) => (
                            <button
                              key={relatedIndex}
                              type="button"
                              onClick={() => handleRelatedQuestionClick(relatedIndex)}
                              className="inline-flex items-center rounded-full bg-background/70 border border-border/60 px-2.5 py-0.5 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                            >
                              {faqs[relatedIndex].question}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </Card>
      </div>
    </section>
  );
};

export default PricingFAQ;
