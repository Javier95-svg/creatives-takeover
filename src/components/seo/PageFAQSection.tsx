import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FAQItem {
  question: string;
  answer: string;
}

interface PageFAQSectionProps {
  title?: string;
  description?: string;
  faqs: FAQItem[];
}

export default function PageFAQSection({
  title = "Common founder questions",
  description,
  faqs,
}: PageFAQSectionProps) {
  return (
    <section className="rounded-5xl border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur sm:p-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
        ) : null}
      </div>

      <Accordion type="single" collapsible className="mx-auto mt-8 max-w-4xl space-y-3">
        {faqs.map((faq, index) => (
          <AccordionItem
            key={faq.question}
            value={`faq-${index}`}
            className="rounded-2xl border border-border/60 bg-background/80 px-5"
          >
            <AccordionTrigger className="text-left text-base font-semibold hover:no-underline">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
              <div className="space-y-3">
                {faq.answer
                  .split("\n\n")
                  .filter((paragraph) => paragraph.trim().length > 0)
                  .map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
