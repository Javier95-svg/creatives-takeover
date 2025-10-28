import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";

const PricingFAQ = () => {
  const faqs = [
    {
      question: "Can I change plans later?",
      answer: "Absolutely! You can upgrade or downgrade your plan at any time. If you upgrade, you'll be charged the prorated difference. If you downgrade, the new rate applies at your next billing cycle."
    },
    {
      question: "What happens when I run out of AI conversation credits?",
      answer: "When you reach your monthly limit, you can either upgrade to a higher tier or purchase additional credit packs. Your access to other features remains unaffected."
    },
    {
      question: "Do you offer refunds?",
      answer: "Yes! We offer a 30-day money-back guarantee. If you're not satisfied with your paid plan within the first 30 days, contact us for a full refund—no questions asked."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes, you can cancel your subscription at any time from your account settings. There are no cancellation fees, and you'll retain access until the end of your current billing period."
    },
    {
      question: "Is my payment information secure?",
      answer: "Your payment information is completely secure. We use Stripe for payment processing, which is PCI-DSS compliant and uses bank-level encryption. We never store your credit card details on our servers."
    },
    {
      question: "What's included in the free tier?",
      answer: "The free tier includes access to basic AI conversations (10 per month), community features, and our resource library. It's perfect for exploring the platform before committing to a paid plan."
    },
    {
      question: "How does billing work?",
      answer: "You'll be billed monthly or annually depending on your chosen plan. Annual plans offer a discount. Billing is automatic, and you'll receive an invoice via email. You can manage your billing details in your account settings."
    },
    {
      question: "Can I get a custom plan for my team?",
      answer: "Yes! If you need a custom plan with specific features or a larger team size, contact our sales team. We'll work with you to create a plan that fits your needs."
    }
  ];

  return (
    <section className="py-20 relative z-10">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Common Questions About Our Plans
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about our pricing and plans
          </p>
        </div>

        <Card className="max-w-4xl mx-auto bg-background/60 backdrop-blur-sm border-border/50 p-8">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-foreground hover:text-primary">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>
    </section>
  );
};

export default PricingFAQ;
