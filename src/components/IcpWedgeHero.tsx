import { useState } from "react";
import { ArrowRight, BarChart2, Target, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { trackSoftGateShown } from "@/lib/analytics";
import { persistIcpSeed } from "@/lib/icpSeed";
import SoftGateModal from "@/components/auth/SoftGateModal";

const bullets = [
  { icon: BarChart2, text: "Niche viability score out of 100" },
  { icon: Target,   text: "Pain points & positioning mapped by AI" },
  { icon: Zap,      text: "Takes under 5 minutes — free forever" },
];

const IcpWedgeHero = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [seed, setSeed] = useState("");
  const [gateOpen, setGateOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isAuthenticated) {
      persistIcpSeed(seed);
      navigate("/icp-builder");
      return;
    }

    trackSoftGateShown({ trigger: "wedge-hero" });
    setGateOpen(true);
  };

  return (
    <>
      <section className="homepage-section relative pt-[calc(var(--mobile-nav-offset,0px)+2.5rem)] sm:pt-[calc(var(--mobile-nav-offset,0px)+3rem)] md:pt-32 pb-16 md:pb-28 px-4 sm:px-6">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent pointer-events-none" />

        <div className="container mx-auto max-w-3xl relative z-10 text-center">
          {/* Stage pill */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full mb-6">
            <span className="text-xs font-semibold tracking-widest uppercase text-primary">Stage 1 · Free</span>
          </div>

          {/* Headline */}
          <h1 className="font-space-grotesk text-[2.125rem] sm:text-[2.75rem] md:text-[3.5rem] font-semibold leading-[1.12] tracking-tight mb-5">
            <span className="text-primary block [text-shadow:0_0_22px_rgba(59,130,246,0.28)]">Know Your Customer</span>
            <span className="block text-white [text-shadow:0_0_24px_rgba(255,255,255,0.18),0_2px_10px_rgba(15,23,42,0.28)]">Before You Build</span>
          </h1>

          {/* Subline */}
          <p className="text-[15px] sm:text-base md:text-lg text-muted-foreground leading-[1.8] max-w-xl mx-auto mb-8">
            Describe your idea in one sentence. We'll generate a complete ICP draft — your target customer, their pain points, and your positioning.
          </p>

          {/* Seed input + CTA */}
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto mb-8">
            <input
              type="text"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="e.g. AI scheduling tool for freelance designers"
              className="flex-1 h-12 rounded-button border border-border/70 bg-background/80 px-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 backdrop-blur-sm"
              maxLength={200}
            />
            <Button type="submit" size="lg" className="h-12 px-6 font-semibold whitespace-nowrap">
              Build My ICP
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </form>

          {/* Bullets */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8">
            {bullets.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-3 h-3 text-primary" />
                </div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      <SoftGateModal
        open={gateOpen}
        onOpenChange={setGateOpen}
        seed={seed}
        trigger="wedge-hero"
        title="Save your ICP and keep building"
        description="Create your founder profile in 10 seconds. Free forever. No credit card."
        returnPathOverride="/icp-builder"
      />
    </>
  );
};

export default IcpWedgeHero;
