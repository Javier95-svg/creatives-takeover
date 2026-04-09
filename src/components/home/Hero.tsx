import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackIcpBuilderStartedUngated } from "@/lib/analytics";

const ICP_SEED_STORAGE_KEY = "ct_icp_seed";
const ICP_SIGNUP_RETURN_PATH = "/icp-builder";

interface HeroProps {
  onRequestSoftGate?: (seed: string) => void;
  softGateEnabled?: boolean;
}

const Hero = ({ onRequestSoftGate, softGateEnabled = false }: HeroProps) => {
  const navigate = useNavigate();
  const [seed, setSeed] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedSeed = seed.trim();

    if (normalizedSeed) {
      sessionStorage.setItem(ICP_SEED_STORAGE_KEY, normalizedSeed);
    } else {
      sessionStorage.removeItem(ICP_SEED_STORAGE_KEY);
    }

    trackIcpBuilderStartedUngated({ source: "hero" });

    if (softGateEnabled && onRequestSoftGate) {
      onRequestSoftGate(normalizedSeed);
      return;
    }

    // TODO(soft-gate): wire the in-place modal open path in Quick Win 3.
    navigate(
      `/signup?source=hero-icp&return=${encodeURIComponent(ICP_SIGNUP_RETURN_PATH)}`,
    );
  };

  return (
    <section className="homepage-section scroll-mt-24 relative pt-[calc(var(--mobile-nav-offset,0px)+0.75rem)] sm:pt-[calc(var(--mobile-nav-offset,0px)+1.25rem)] md:pt-24 pb-12 sm:pb-18 md:pb-24 px-4 sm:px-6">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/[0.04] to-transparent pointer-events-none" />

      <div className="container mx-auto max-w-7xl relative z-10">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-[32px] border border-border/70 bg-background/82 px-6 py-12 shadow-[0_32px_90px_-56px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:px-10 sm:py-14 lg:px-14 lg:py-16">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-primary sm:text-sm">
                For first-time founders
              </p>
              <h1 className="mt-4 font-space-grotesk text-4xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-5xl lg:text-[4.3rem]">
                From idea to funded. Built for founders who ship.
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                7 stages, AI-powered tools, and a community of mentors, angels, and co-founders - in one place. Free forever. No credit card.
              </p>
            </div>

            <form
              className="mx-auto mt-10 max-w-3xl"
              onSubmit={handleSubmit}
            >
              <div className="rounded-[28px] border border-border/70 bg-card/88 p-3 shadow-[0_20px_44px_-30px_rgba(15,23,42,0.3)] sm:p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Input
                    aria-label="What problem are you obsessed with solving?"
                    autoComplete="off"
                    className="h-14 rounded-[20px] border-border/80 bg-background/88 px-5 text-base sm:flex-1"
                    onChange={(event) => setSeed(event.target.value)}
                    placeholder="What problem are you obsessed with solving?"
                    value={seed}
                  />
                  <Button
                    className="h-14 rounded-[20px] px-6 text-base font-semibold sm:min-w-[220px]"
                    size="lg"
                    type="submit"
                  >
                    Build my ICP
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
              <p className="mt-4 text-center text-sm font-medium text-muted-foreground">
                Takes 60 seconds. Start free.
              </p>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
