import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const metrics = [
  {
    label: "Average plan time",
    value: "3 min",
    detail: "From idea to structured roadmap",
  },
  {
    label: "Founder momentum",
    value: "4.7x",
    detail: "Reported increase in weekly output",
  },
  {
    label: "Funding readiness",
    value: "72%",
    detail: "Founders improve readiness score",
  },
  {
    label: "Retention lift",
    value: "2.4x",
    detail: "With accountability tracking",
  },
];

const HomeMetrics = () => {
  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container max-w-6xl">
        <div className="flex flex-col gap-6">
          <div className="max-w-2xl">
            <Badge variant="outline" className="mb-4 text-muted-foreground">
              Proof of momentum
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Signals that show traction and execution.
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Measured outcomes designed to communicate credibility to mentors,
              accelerators, and early investors.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((metric) => (
              <Card key={metric.label} className="border-border/60 bg-card">
                <CardContent className="p-6 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {metric.label}
                  </p>
                  <p className="text-3xl font-semibold text-foreground">
                    {metric.value}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {metric.detail}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeMetrics;
