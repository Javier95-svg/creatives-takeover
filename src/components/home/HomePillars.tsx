import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Sparkles, Target, Users } from "lucide-react";

const pillars = [
  {
    title: "BizMap AI",
    description:
      "Turn a raw idea into a structured business plan with market, solution, and go-to-market clarity.",
    icon: Sparkles,
  },
  {
    title: "Momentum Dashboard",
    description:
      "Stay accountable with milestones, sprints, and progress signals that keep execution on track.",
    icon: LayoutDashboard,
  },
  {
    title: "Insighta Funding",
    description:
      "Find accelerators, grants, and funding readiness signals without scattered research.",
    icon: Target,
  },
  {
    title: "Founder Community",
    description:
      "Tap into peer feedback, mentors, and structured collaboration designed for creatives.",
    icon: Users,
  },
];

const HomePillars = () => {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container max-w-6xl">
        <div className="max-w-3xl">
          <Badge variant="outline" className="mb-4 text-muted-foreground">
            Product pillars
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Everything you need to move from idea to launch.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            A focused stack of tools built to replace scattered docs, generic
            templates, and inconsistent accountability.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <Card key={pillar.title} className="border-border/60 bg-card">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-primary" />
                    <div className="h-1 w-8 rounded-full bg-primary/15" />
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {pillar.title}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default HomePillars;
