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
import { PRICING_FAQS } from "@/config/pricingFaq";

const PricingFAQ = () => {
  const [helpfulVotes, setHelpfulVotes] = useState<Record<number, "up" | "down" | null>>({});
  const [openItem, setOpenItem] = useState<string | undefined>();

  const faqs = PRICING_FAQS;

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
