import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { HOME_FAQS } from "@/data/homeFaq";
import HomeSectionHeader from "@/components/home/HomeSectionHeader";

const HomeFAQ = () => {
  const faqs = HOME_FAQS;

  return (
    <section className="relative py-20 lg:py-28 hx-faq" aria-labelledby="faq-heading">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="hx-faq__grid">
          {/* The heading stays in view beside the answers on wide screens. */}
          <div className="hx-faq__aside">
            <HomeSectionHeader badge="Questions" title="FAQs" id="faq-heading">
              Everything you need to know about Creatives Takeover.
            </HomeSectionHeader>
            <Link to="/contact" className="hs-button hs-button--ghost">
              Ask us something else
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>

          <div>
            <Accordion type="single" collapsible className="hx-faq__list">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="hx-faq__item"
                >
                  <AccordionTrigger className="hx-faq__q text-left text-base md:text-lg font-semibold tracking-tight">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="hx-faq__a text-sm sm:text-base text-muted-foreground leading-relaxed">
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
