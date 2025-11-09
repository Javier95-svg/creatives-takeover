import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, LayoutDashboard } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import heroImage from "@/assets/hero-team-collaboration.jpg";

const Hero = () => {
  const { isAuthenticated } = useAuth();
  
  return (
    <section
      id="overview"
      className="scroll-mt-24 relative min-h-screen flex items-center justify-center overflow-hidden bg-background"
    >
      <div className="container mx-auto relative z-20">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-[1.1fr,0.9fr] items-center gap-10 px-4">
          {/* Main Headline */}
          <div className="text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs sm:text-sm font-medium mb-6">
              <span>Founder-grown • Human backed</span>
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-semibold mb-6 creatives-font leading-tight tracking-tight text-foreground">
              Build a real business with the co-founder who never sleeps
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-6 max-w-xl leading-relaxed">
              BizMap blends thoughtful operators with an AI teammate so you can test ideas, talk to customers, and earn your first revenue in 30 days—without going it alone.
            </p>
            
            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center gap-4 mb-10 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span>Trusted by 2,100 indie founders</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                <span>Shipped by creatives, not VCs</span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <Button 
                size="lg" 
                className="bg-primary text-primary-foreground px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg btn-magnetic relative overflow-hidden w-full sm:w-auto" 
                aria-label="Start My 30-Day Plan" 
                asChild
              >
                <Link to="/bizmap-ai">
                  <span className="relative z-10">Start My 30-Day Plan</span>
                  <ArrowRight className="ml-2 w-4 sm:w-5 h-4 sm:h-5 relative z-10" />
                </Link>
              </Button>
              
              <Button 
                size="lg" 
                variant="outline" 
                className="border border-foreground/15 hover:bg-foreground/5 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg btn-magnetic relative w-full sm:w-auto" 
                aria-label="Explore the Dashboard"
                asChild
              >
                <Link to="/dashboard">
                  <LayoutDashboard className="mr-2 w-4 sm:w-5 h-4 sm:h-5" />
                  <span>Explore the Dashboard</span>
                </Link>
              </Button>
            </div>
          </div>

          {/* Founders imagery / card stack */}
          <div className="hidden lg:flex justify-end">
            <div className="relative max-w-xl">
              <div className="rounded-3xl overflow-hidden border border-border/40 bg-card shadow-2xl">
                <img
                  src={heroImage}
                  alt="Founders collaborating with BizMap"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-10 -left-12 bg-background/95 rounded-2xl shadow-lg border border-border/40 px-6 py-4 w-64">
                <p className="text-sm text-muted-foreground mb-2">“We shipped our first paid cohort in 18 days with BizMap keeping us accountable.”</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground font-semibold">MJ</div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Mayra James</p>
                    <p className="text-xs text-muted-foreground">Founder, The Workshop Studio</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Features */}
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-6 lg:gap-8">
            <div className="rounded-2xl border border-border/40 bg-card shadow-sm p-6 text-left">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-primary" />
                <span className="text-sm uppercase tracking-wide text-muted-foreground">Launch Support</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">A plan grounded in real founder experience</h3>
              <p className="text-sm text-muted-foreground">
                Follow a proven 30-day rhythm created by operators who’ve launched agencies, membership products, and community-first startups.
              </p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-card shadow-sm p-6 text-left">
              <div className="flex items-center gap-3 mb-4">
                <ArrowRight className="w-6 h-6 text-secondary" />
                <span className="text-sm uppercase tracking-wide text-muted-foreground">Guided AI</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">AI that stays in its lane</h3>
              <p className="text-sm text-muted-foreground">
                BizMap keeps context, nudges you with next steps, and escalates to human advice when decisions need nuance.
              </p>
            </div>
            <div className="rounded-2xl border border-border/40 bg-card shadow-sm p-6 text-left sm:col-span-1">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-6 h-6 text-accent" />
                <span className="text-sm uppercase tracking-wide text-muted-foreground">Accountability</span>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Humans in the loop</h3>
              <p className="text-sm text-muted-foreground">
                Get matched with fellow founders and BizMap coaches for weekly check-ins so you always know what to do next.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;