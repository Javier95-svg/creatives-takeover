import { Card, CardContent } from "@/components/ui/card";

interface AnswerSummaryItem {
  label: string;
  title: string;
  description: string;
}

interface AnswerSummaryProps {
  eyebrow?: string;
  title: string;
  description: string;
  items: AnswerSummaryItem[];
  updatedLabel?: string;
}

export default function AnswerSummary({
  eyebrow = "Founder quick answer",
  title,
  description,
  items,
  updatedLabel,
}: AnswerSummaryProps) {
  return (
    <section className="rounded-[2rem] border border-border/60 bg-card/70 p-6 shadow-sm backdrop-blur sm:p-8">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">{eyebrow}</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
        {updatedLabel ? (
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
            Last updated {updatedLabel}
          </p>
        ) : null}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <Card key={item.title} className="border-border/60 bg-background/80 shadow-none">
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">{item.label}</p>
              <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
