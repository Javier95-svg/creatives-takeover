import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    {
      question: "How does pricing work?",
      answer: "Choose from three flexible plans: Starter ($9.99/month), Elite ($19.99/month), or Teams ($39.99/month). Save 20% with annual billing. All plans include a 7-day free trial with no commitment."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Absolutely! You can cancel your subscription at any time with just one click in your account settings. No cancellation fees, no hassle. Your access continues until the end of your current billing period."
    },
    {
      question: "What's your refund policy?",
      answer: "We offer a 30-day money-back guarantee for all new subscriptions. If you're not completely satisfied, contact our support team for a full refund, no questions asked."
    },
    {
      question: "How do you protect my privacy?",
      answer: "Your privacy is our priority. We use industry-standard encryption, never sell your data, and only collect what's necessary to enhance your experience. Read our full privacy policy for complete transparency."
    },
    {
      question: "What makes Creatives Takeover unique?",
      answer: "We're the only platform combining unlimited access to premium creative content with AI-powered personalized recommendations, exclusive early releases, and a thriving community of creators. It's like Netflix, but for creativity."
    }
  ];

  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="container mx-auto max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Frequently Asked Questions
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Got questions? We've got answers. Find everything you need to know about Creatives Takeover.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-card border border-border rounded-lg px-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <AccordionTrigger className="text-left text-lg font-semibold hover:no-underline py-6">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-6 text-base leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="text-center mt-12">
          <p className="text-muted-foreground mb-4">
            Still have questions?
          </p>
          <a 
            href="mailto:support@creativestakeover.com" 
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Contact our support team →
          </a>
        </div>
      </div>
    </section>
  );
};

export default FAQ;