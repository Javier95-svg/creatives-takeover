import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

const steps = [
  {
    step: "01",
    title: "Capture the idea",
    description:
      "Answer guided prompts to clarify the problem, customer, and positioning.",
  },
  {
    step: "02",
    title: "Generate the plan",
    description:
      "BizMap AI structures your roadmap, risks, and launch path in minutes.",
  },
  {
    step: "03",
    title: "Execute with momentum",
    description:
      "Track weekly progress, tasks, and accountability signals in one workspace.",
  },
  {
    step: "04",
    title: "Access capital signals",
    description:
      "Use Insighta to surface funding opportunities and readiness checkpoints.",
  },
];

const HomeHowItWorks = () => {
  return (
    <section className="py-16 lg:py-24 bg-muted/40">
      <div className="container max-w-6xl">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 text-muted-foreground">
              How it works
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              From idea to launch with an operating system built for founders.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Replace ad-hoc planning with a structured, repeatable workflow.
            </p>
          </div>
          <p className="text-sm text-muted-foreground max-w-sm">
            Each step creates tangible artifacts you can share with co-founders,
            mentors, or investors.
          </p>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-4">
          {steps.map((step, index) => (
            <Card key={step.step} className="border-border/60 bg-background">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{step.step}</span>
                  {index < steps.length - 1 && (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {step.title}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeHowItWorks;
