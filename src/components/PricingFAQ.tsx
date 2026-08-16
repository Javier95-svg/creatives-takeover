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

    The six core workflow tools are available across plans. ICP drafting starts free; metered AI actions show their credit cost before they run. For example, a PMF discovery plus evidence score is 10 credits, a proof demo plus evidence score is 8, and a researched GTM play plus Traction scorecard is 8.

    Plan differences primarily change monthly capacity, research limits, and expert/accountability access.`,
      relatedQuestions: [0, 5],
    },
    {
      question: "How should I choose the right plan?",
      answer: `Choose by the outcome and monthly workload you need, not by an artificial stage gate.

Rookie is a free PROVE preview with 50 monthly credits. Starter supports a focused validation loop with 100. Rising gives 250 for repeated SELL and GROW experiments. Pro gives 600 plus deeper research and expert accountability. Your saved artifacts remain connected if you change plans.`,
      relatedQuestions: [1, 6],
    },
    {
      question: "Do unused credits roll over to the next month?",
      answer: `No. Included monthly credits reset on your billing-cycle boundary and do not roll over.

One-time project packs do not reset or expire with the monthly allowance. Use them for a defined validation or launch workload without changing the subscription.`,
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
      answer: `Rookie is free forever and includes 50 monthly credits. The six core workflow tools remain available; metered AI actions disclose their credit cost before execution. ICP drafting begins free, while Demo Studio, PMF scoring, MVP building, GTM research, and Traction actions draw from the same wallet.

    Rookie keeps broader research and fundraising limits intentionally small. Use the comparison table for those capacity limits, not for core-workflow access.`,
      relatedQuestions: [0, 1],
    },
    {
      question: "What happens to my data if I downgrade?",
      answer: `Downgrading changes what you can create next, not whether your existing work still exists.

    You keep your prior data, but any plan-locked actions follow the limits of your new tier. GTM Strategist remains available using account credits; researched generations still use 6 credits and saved workspaces remain accessible.`,
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
                          className={`h-9 w-9 rounded-full border border-border/60 ${vote === "up" ? "text-success" : ""}`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(index, "down")}
                          className={`h-9 w-9 rounded-full border border-border/60 ${vote === "down" ? "text-destructive" : ""}`}
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
