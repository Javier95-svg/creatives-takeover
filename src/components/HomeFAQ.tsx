import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HOME_FAQS } from "@/data/homeFaq";

const HomeFAQ = () => {
  const faqs = HOME_FAQS;

  return (
    <section className="relative py-20 lg:py-28">

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-16">
          <h2 className="font-space-grotesk text-3xl sm:text-4xl md:text-5xl font-semibold mb-4 sm:mb-6 text-foreground">
            FAQs
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Everything you need to know about Creatives Takeover.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="rounded-2xl border border-border/60 bg-card p-4 sm:p-6 lg:p-8 shadow-sm">
            <Accordion type="single" collapsible className="space-y-0">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border-b border-border/40 px-4 sm:px-6 last:border-b-0"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base md:text-lg font-semibold py-5 lg:py-6 tracking-tight">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed pt-2">
                    {faq.answer.split('\n\n').filter(para => para.trim()).map((paragraph, idx) => (
                      <p key={idx} className="mb-3 last:mb-0">
                        {paragraph.trim()}
                      </p>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

      </div>
    </section>
  );
};

export default HomeFAQ;
