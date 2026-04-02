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
import { ThumbsUp, ThumbsDown, Maximize2, Minimize2 } from "lucide-react";

const PricingFAQ = () => {
  const [expandAll, setExpandAll] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState<Record<number, 'up' | 'down' | null>>({});
  const faqs = [
    {
      question: "Can I change plans later?",
      answer: `Absolutely! We understand that your business needs evolve, and your plan should evolve with you. You can upgrade or downgrade at any time with complete flexibility.

When you upgrade, you'll immediately unlock new features and only pay the prorated difference for the remainder of your billing cycle. No penalties, no hassle. If you decide to downgrade, your new rate takes effect at the next billing cycle, so you never lose out on what you've already paid for.

This flexibility means you can start small and scale up as you grow, or adjust based on seasonal needs. We're here to support your journey, not lock you into a rigid contract.`,
      relatedQuestions: [1, 3]
    },
    {
      question: "What are credits and how do they work?",
      answer: `Credits are the currency that powers AI-driven features on the platform. Every plan comes with a monthly credit allowance — Rookie gets 25, Rising gets 50, and Pro gets 150.

Credits are spent when you use AI-powered tools: running the PMF Lab, generating a Tech Stack recommendation, analyzing a pitch deck, or having a conversation with our AI tools. Each action has a fixed cost shown before you confirm it. Free tools like the ICP Builder never cost credits.

Dashboard features, Stories, community browsing, and reading Prompt Library content are always free — credits only apply to AI actions that generate output specifically for your business.`,
      relatedQuestions: [0, 5]
    },
    {
      question: "Do unused credits roll over to the next month?",
      answer: `Credits reset on the first of each month and do not roll over. This keeps the system predictable and ensures every subscriber gets their full allocation fresh each billing cycle.

If you regularly hit your limit before month-end, it's a strong signal that you'd benefit from upgrading to the next plan. Conversely, if you're rarely using credits, the Rookie plan might be enough for your current stage.`,
      relatedQuestions: [0, 1]
    },
    {
      question: "Do you offer refunds?",
      answer: `Yes, we stand behind our platform with a comprehensive 30-day money-back guarantee on all paid plans. If you're not completely satisfied within your first 30 days, simply reach out to us and we'll issue a full refund. No questions asked, no complicated forms, no hoops to jump through.

We've built this platform to genuinely help founders succeed, and we're confident you'll see real value quickly. However, we also understand that every business is unique, and sometimes timing or fit isn't right.

Our straightforward refund policy removes all risk from trying our premium features. Join thousands of entrepreneurs who took the leap risk-free and discovered tools that transformed their business journey.`,
      relatedQuestions: [3, 4]
    },
    {
      question: "Can I cancel anytime?",
      answer: `Yes, you have complete control with zero lock-in. Cancel your subscription anytime directly from your account settings with a single click. No need to call, email, or explain your decision. There are absolutely no cancellation fees, penalties, or hidden charges.

You'll retain full access to all premium features until the end of your current billing period, ensuring you get every day you've paid for. This commitment-free approach reflects our confidence in the platform. We earn your subscription every month by delivering real value, not by trapping you in contracts.

Many users who pause their subscription come back when they're ready because the platform genuinely supports their goals. Your success journey should be on your terms, always.`,
      relatedQuestions: [0, 2]
    },
    {
      question: "Is my payment information secure?",
      answer: `Your security is our top priority. We partner with Stripe, the gold standard in online payment processing trusted by millions of businesses worldwide including Amazon, Google, and Shopify. Stripe is PCI-DSS Level 1 certified, which is the highest security standard in the payment industry, and employs bank-level 256-bit SSL encryption for all transactions.

Here's what really matters: we never see or store your credit card details on our servers. Ever. All sensitive payment information is tokenized and encrypted by Stripe's secure infrastructure. Additionally, we implement regular security audits, two-factor authentication options, and comply with GDPR and international data protection regulations.

You can focus on building your business knowing your financial data is protected by enterprise-grade security infrastructure.`,
      relatedQuestions: [6]
    },
    {
      question: "What's included in the Rookie plan?",
      answer: `The Rookie plan is free and genuinely useful — not just a teaser. You get 25 credits per month and access to our core tools: the ICP Builder (Stage 1) is completely free with no credits needed, and you can use the Waitlist Maker and PMF Lab with credits.

You also get full access to the Insighta Test, Stories, and the Newspaper. For community features, you can browse mentors and co-founders. VC Search and Accelerator Hunt let you browse lists but not open profiles.

It's the perfect starting point to validate your idea and get your first AHA moment before committing to a paid plan. No credit card required.`,
      relatedQuestions: [0, 1]
    },
    {
      question: "What happens to my data if I downgrade?",
      answer: `Your data is always safe, regardless of plan changes. If you downgrade from Rising or Pro to Rookie, you retain full read access to everything you've built — ICP profiles, PMF Lab results, previous analyses, community posts, and all saved content.

What changes is your ability to create new content in plan-locked features. For example, you won't be able to generate new email templates or view new VC profiles beyond Rookie limits. Your existing data and history stay intact.

We never delete your account data when you downgrade. Upgrade again any time to regain full access.`,
      relatedQuestions: [0, 3]
    },
    {
      question: "How does billing work?",
      answer: `We've designed our billing to be transparent, predictable, and hassle-free. Choose between monthly or annual billing based on what works best for your cash flow. Annual plans include a generous discount and are perfect if you're committed to long-term growth.

Billing is completely automatic, so you'll never worry about manual renewals or service interruptions. Before each billing cycle, you'll receive a detailed invoice via email showing exactly what you're being charged. Manage everything from your account dashboard. Update payment methods, change billing cycles, view past invoices, and track your spending, all in one place.

We accept all major credit cards and support multiple currencies for international entrepreneurs. Every transaction includes a professional invoice for your accounting needs. If there's ever a billing question, our responsive support team resolves issues quickly. Transparent billing means you can focus on building your business, not managing subscriptions.`,
      relatedQuestions: [4, 0]
    },
    {
      question: "Can I get a custom plan for my team?",
      answer: `Absolutely! We love working with teams, agencies, and growing organizations that need tailored solutions. If our standard plans don't quite fit, whether you need more seats, custom credit allocations, specific feature combinations, dedicated support, or enterprise-level security, we'll create a custom plan designed specifically for your needs and budget.

Our sales team specializes in understanding your unique requirements and building flexible packages that deliver maximum value. Custom plans can include priority onboarding, team training sessions, dedicated account management, advanced analytics, white-labeling options, API access, and more.

We've successfully partnered with startup incubators, business consultancies, corporate innovation teams, and educational institutions. Schedule a no-pressure consultation call with our team, and let's discuss how Creatives Takeover can become your organization's competitive advantage. Whether you're a team of 5 or 500, we'll find the perfect solution together.`,
      relatedQuestions: [0, 6]
    }
  ];

  const handleVote = (index: number, vote: 'up' | 'down') => {
    setHelpfulVotes(prev => ({
      ...prev,
      [index]: prev[index] === vote ? null : vote
    }));
  };

  return (
    <section className="relative py-section-mobile lg:py-section-desktop overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="text-center mb-12 animate-fade-in">
          <h2 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-8 pb-2 gradient-text font-space-grotesk">
            Pricing FAQ
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto font-poppins">
            Get clear and honest answers about our pricing, billing, features, and commitment to your success. There are no hidden fees or unexpected costs. We provide straightforward, transparent information to help you make the right decision.
          </p>
        </div>

        <Card className="max-w-4xl mx-auto rounded-2xl bg-card/80 backdrop-blur-sm border-border/60 p-8 animate-fade-in shadow-xl">
          <Accordion 
            type="single" 
            collapsible 
            className="w-full"
            value={expandAll ? faqs.map((_, i) => `item-${i}`).join(',') : undefined}
          >
            {faqs.map((faq, index) => {
                const vote = helpfulVotes[index];
              
              return (
                <AccordionItem key={index} value={`item-${index}`} className="border-border/60">
                  <AccordionTrigger className="text-left text-foreground hover:text-primary font-space-grotesk text-base sm:text-lg">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-4 font-poppins">
                    <div className="space-y-3">
                      {faq.answer.split('\n\n').map((paragraph, pIndex) => (
                        <p key={pIndex}>{paragraph.trim()}</p>
                      ))}
                    </div>
                    
                    {/* Was this helpful */}
                    <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                      <span className="text-sm text-muted-foreground">Was this helpful?</span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(index, 'up')}
                          className={`h-9 w-9 rounded-full border border-border/60 ${vote === 'up' ? 'text-green-600' : ''}`}
                        >
                          <ThumbsUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVote(index, 'down')}
                          className={`h-9 w-9 rounded-full border border-border/60 ${vote === 'down' ? 'text-red-600' : ''}`}
                        >
                          <ThumbsDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Related Questions */}
                    {faq.relatedQuestions && faq.relatedQuestions.length > 0 && (
                      <div className="pt-4">
                        <p className="text-sm font-medium text-foreground mb-2">Related questions:</p>
                        <div className="flex flex-wrap gap-2">
                          {faq.relatedQuestions.map((relatedIndex) => (
                            <Badge 
                              key={relatedIndex}
                              variant="secondary" 
                              className="cursor-pointer rounded-full bg-background/70 border border-border/60 hover:bg-primary/10"
                            >
                              {faqs[relatedIndex].question}
                            </Badge>
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
