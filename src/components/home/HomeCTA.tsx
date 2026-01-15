import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useConversionTracking } from "@/hooks/useConversionTracking";

const HomeCTA = () => {
  const { isAuthenticated } = useAuth();
  const { trackEngagement, trackSignupStarted } = useConversionTracking();

  const handleClick = () => {
    trackEngagement("home-final-cta", 90);
    if (!isAuthenticated) {
      trackSignupStarted("home-final-cta");
    }
  };

  return (
    <section className="py-16 lg:py-24 bg-background">
      <div className="container max-w-6xl">
        <Card className="border-border/60 bg-muted/40">
          <div className="p-8 lg:p-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="max-w-2xl space-y-3">
              <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
                Build with clarity, ship with confidence.
              </h2>
              <p className="text-lg text-muted-foreground">
                Start free, generate a plan, and move into execution with a
                professional founder workspace.
              </p>
            </div>
            <Button size="lg" asChild onClick={handleClick} className="group">
              <Link to={isAuthenticated ? "/dashboard" : "/signup"}>
                {isAuthenticated ? "Open dashboard" : "Start free today"}
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Link>
            </Button>
          </div>
        </Card>
      </div>
    </section>
  );
};

export default HomeCTA;
