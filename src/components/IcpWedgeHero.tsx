import { useState, useTransition } from "react";
import { ArrowRight, BarChart2, Target, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { persistIcpSeed } from "@/lib/icpSeed";

const bullets = [
  { icon: BarChart2, text: "See your best-fit customer and core pain fast" },
  { icon: Target, text: "Get a founder-specific positioning draft" },
  { icon: Zap, text: "Start with one sentence — free forever" },
];

const IcpWedgeHero = () => {
  const navigate = useNavigate();
  const [seed, setSeed] = useState("");
  const [isNavigating, startNavigation] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNavigating) return;

    if (seed.trim()) {
      persistIcpSeed(seed);
    }
    startNavigation(() => {
      navigate("/icp-builder");
    });
  };

  return (
    <section className="homepage-section relative px-4 pb-16 pt-[calc(var(--mobile-nav-offset,0px)+2.5rem)] sm:px-6 sm:pt-[calc(var(--mobile-nav-offset,0px)+3rem)] md:pb-28 md:pt-32">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent pointer-events-none" />

      <div className="container mx-auto max-w-3xl relative z-10 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 mb-6">
          <span className="text-xs font-semibold tracking-widest uppercase text-primary">Stage 1 · Free</span>
        </div>

        <h1 className="font-space-grotesk mb-5 text-[2.125rem] font-semibold leading-[1.12] tracking-tight sm:text-[2.75rem] md:text-[3.5rem]">
          <span className="text-primary block [text-shadow:0_0_22px_rgba(59,130,246,0.28)]">Find Your Best-Fit Customer</span>
          <span className="block text-white [text-shadow:0_0_24px_rgba(255,255,255,0.18),0_2px_10px_rgba(15,23,42,0.28)]">Before You Build</span>
        </h1>

        <p className="mx-auto mb-8 max-w-xl text-[15px] leading-[1.8] text-muted-foreground sm:text-base md:text-lg">
          Describe your idea. We&apos;ll draft your customer, pain, and positioning for free before you create an account.
        </p>

        <form
          onSubmit={handleSubmit}
          className={`mx-auto mb-4 flex max-w-xl flex-col gap-3 sm:flex-row ${isNavigating ? 'pointer-events-none opacity-70' : ''}`}
        >
          <input
            type="text"
            value={seed}
            onChange={(e) => setSeed(e.target.value)}
            disabled={isNavigating}
            placeholder="e.g. AI scheduling tool for freelance designers"
            className="h-12 flex-1 rounded-button border border-border/70 bg-background/80 px-4 text-sm text-foreground placeholder:text-muted-foreground backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            maxLength={200}
          />
          <Button type="submit" size="lg" className="h-12 whitespace-nowrap px-6 font-semibold" disabled={isNavigating}>
            {isNavigating ? "Opening builder..." : "Generate My Free Draft"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </form>

        <p className="mb-8 text-sm text-muted-foreground">No account required to see your first preview.</p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
          {bullets.map(({ icon: Icon, text }) => (
            <div key={text} className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <Icon className="h-3 w-3 text-primary" />
              </div>
              {text}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IcpWedgeHero;
