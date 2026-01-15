import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useConversionTracking } from "@/hooks/useConversionTracking";

const HomeHero = () => {
  const { isAuthenticated } = useAuth();
  const { trackTriggerView, trackEngagement, trackSignupStarted } =
    useConversionTracking();
  const heroRef = useRef<HTMLElement>(null);
  const hasTrackedView = useRef(false);

  useEffect(() => {
    if (hasTrackedView.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            trackTriggerView("home-hero-cta", {
              authenticated: isAuthenticated,
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, [trackTriggerView, isAuthenticated]);

  const handlePrimaryClick = () => {
    trackEngagement("home-hero-primary", 85);
    if (!isAuthenticated) {
      trackSignupStarted("home-hero-primary");
    }
  };

  const handleSecondaryClick = () => {
    trackEngagement("home-hero-secondary", 70);
  };

  return (
    <section ref={heroRef} className="pt-24 pb-16 lg:pt-32 lg:pb-24">
      <div className="container max-w-6xl">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <Badge variant="secondary" className="mb-6">
              YC-ready AI co-founder for creative founders
            </Badge>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground">
              Build a real business from your creative idea in weeks, not months.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
              Creatives Takeover combines AI planning, accountability, and
              funding intelligence into one focused workflow. Move from idea to
              launch with clarity, structure, and momentum.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                className="group"
                asChild
                onClick={handlePrimaryClick}
              >
                <Link to={isAuthenticated ? "/dashboard" : "/signup"}>
                  {isAuthenticated ? "Open dashboard" : "Start building"}
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                asChild
                onClick={handleSecondaryClick}
              >
                <Link to="/bizmap-ai">
                  Explore BizMap AI
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 text-sm text-muted-foreground">
              {[
                "3-minute business plan",
                "Founder accountability system",
                "Funding signals in one place",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-foreground" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <Card className="border-border/60 bg-card/80 shadow-lg">
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      Product overview
                    </p>
                    <p className="text-lg font-semibold text-foreground">
                      Founder Workspace
                    </p>
                  </div>
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div className="grid gap-4">
                  {[
                    {
                      title: "BizMap AI Plan",
                      body: "Structured roadmap with market, problem, and launch steps.",
                    },
                    {
                      title: "Momentum Dashboard",
                      body: "Weekly milestones, accountability check-ins, and progress signals.",
                    },
                    {
                      title: "Insighta Funding Intel",
                      body: "Curated accelerators, grants, and funding readiness tracking.",
                    },
                  ].map((item) => (
                    <div
                      key={item.title}
                      className="rounded-lg border border-border/60 bg-background/70 p-4"
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.body}
                      </p>
                    </div>
                  ))}
                </div>
                <div className="rounded-lg border border-dashed border-border/70 bg-muted/40 p-4 text-sm text-muted-foreground">
                  Designed for creative founders who want a professional plan
                  without the corporate overhead.
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomeHero;

