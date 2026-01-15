import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

const testimonials = [
  {
    quote:
      "BizMap gave us a plan we could share with advisors in one afternoon. It replaced weeks of scattered docs.",
    name: "Priya Sharma",
    role: "Creative founder",
  },
  {
    quote:
      "The momentum dashboard keeps us honest. We finally have a weekly rhythm and clear accountability.",
    name: "James Mitchell",
    role: "Product builder",
  },
  {
    quote:
      "Insighta made funding research feel structured instead of chaotic. The shortlist was ready in a day.",
    name: "Aisha Okafor",
    role: "Startup operator",
  },
];

const HomeTestimonials = () => {
  return (
    <section className="py-16 lg:py-24 bg-muted/40">
      <div className="container max-w-6xl">
        <div className="max-w-2xl">
          <Badge variant="outline" className="mb-4 text-muted-foreground">
            Founder feedback
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            Teams trust Creatives Takeover to bring structure and clarity.
          </h2>
        </div>
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {testimonials.map((item) => (
            <Card key={item.name} className="border-border/60 bg-background">
              <CardContent className="p-6 space-y-4">
                <p className="text-base text-foreground leading-relaxed">
                  “{item.quote}”
                </p>
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">{item.name}</p>
                  <p>{item.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HomeTestimonials;
