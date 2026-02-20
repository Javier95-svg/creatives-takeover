import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ArrowRight, Bot, Users, TrendingUp } from "lucide-react";

const teaserCards = [
  {
    Icon: Bot,
    label: "BizMap AI Session",
    preview: "Validated ICP for a fintech startup targeting underbanked millennials in Latin America...",
    user: "Founder in Miami, FL",
  },
  {
    Icon: Users,
    label: "Co-Founder Match",
    preview: "Looking for a technical co-founder with experience in mobile and SaaS to join my venture...",
    user: "Creative in New York, NY",
  },
  {
    Icon: TrendingUp,
    label: "VC Connection Made",
    preview: "Secured intro meeting with Sequoia Capital after submitting pitch deck through Insighta...",
    user: "Startup founder in Austin, TX",
  },
];

const MemberExclusiveTeaser = () => {
  return (
    <section className="py-16 px-4 sm:px-6 bg-muted/30">
      <div className="container mx-auto max-w-5xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full mb-4">
            <Lock className="w-3 h-3" />
            Members Only
          </div>
          <h2 className="text-2xl sm:text-3xl font-space-grotesk font-semibold mb-3">
            Members are already building their businesses
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Join to see what your peers are working on, get matched with
            collaborators, and access every tool — free.
          </p>
        </div>

        {/* Blurred activity cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {teaserCards.map(({ Icon, label, preview, user }, idx) => (
            <div key={idx} className="relative rounded-xl overflow-hidden">
              {/* Blurred card content */}
              <Card className="border-border/50">
                <CardContent className="p-4 blur-sm select-none pointer-events-none">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {label}
                    </span>
                  </div>
                  <p className="text-sm text-foreground font-medium mb-2 line-clamp-2">
                    {preview}
                  </p>
                  <p className="text-xs text-muted-foreground">{user}</p>
                </CardContent>
              </Card>

              {/* Lock overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-background/40 backdrop-blur-[2px] rounded-xl">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="w-9 h-9 rounded-full bg-background border border-border flex items-center justify-center shadow-sm">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    Members only
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center">
          <Button size="lg" asChild className="shadow-lg">
            <Link to="/signup">
              Join Free to See What's Inside
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground mt-3">
            Free to join · No credit card required
          </p>
        </div>
      </div>
    </section>
  );
};

export default MemberExclusiveTeaser;
