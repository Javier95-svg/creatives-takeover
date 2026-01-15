import { Badge } from "@/components/ui/badge";

const HomeSocialProof = () => {
  const logos = [
    "Creator Studio",
    "Northwind Labs",
    "Foundry Co.",
    "Atlas Guild",
    "Civic Design",
    "PilotWorks",
  ];

  return (
    <section className="py-12 lg:py-16 border-y border-border/60 bg-background">
      <div className="container max-w-6xl">
        <div className="flex flex-col gap-6 items-center text-center">
          <Badge variant="outline" className="text-muted-foreground">
            Trusted by early-stage founders
          </Badge>
          <p className="text-sm sm:text-base text-muted-foreground max-w-2xl">
            Creatives Takeover is built with founders who need clarity, speed,
            and a reliable operating system for building real businesses.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full text-xs text-muted-foreground">
            {logos.map((logo) => (
              <div
                key={logo}
                className="flex items-center justify-center rounded-md border border-border/50 bg-muted/40 px-3 py-2"
              >
                {logo}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeSocialProof;
