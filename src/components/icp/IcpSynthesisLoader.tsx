import { CheckCircle2, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface IcpSynthesisLoaderProps {
  elapsedMs: number;
  fallbackEmail: string;
  fallbackEmailError?: string | null;
  fallbackState?: "idle" | "submitting" | "submitted";
  onFallbackEmailChange: (value: string) => void;
  onFallbackEmailSubmit: () => void | Promise<void>;
}

// Steps are revealed progressively across the full generation window (~65s).
// Timing is intentionally generous so users always see forward motion.
const STATUS_STEPS: Array<{ label: string; revealAt: number }> = [
  { label: "Reading your startup idea",                revealAt: 0 },
  { label: "Identifying your ideal customer profile",  revealAt: 5000 },
  { label: "Mapping the core pain and trigger moment", revealAt: 13000 },
  { label: "Drafting your build plan",                 revealAt: 23000 },
  { label: "Analysing your competitive edge",          revealAt: 35000 },
  { label: "Writing your moat and market position",    revealAt: 46000 },
  { label: "Finalising your ICP Draft",                revealAt: 56000 },
];

export function IcpSynthesisLoader({
  elapsedMs,
  fallbackEmail,
  fallbackEmailError = null,
  fallbackState = "idle",
  onFallbackEmailChange,
  onFallbackEmailSubmit,
}: IcpSynthesisLoaderProps) {
  const completedSteps = STATUS_STEPS.filter((step) => elapsedMs >= step.revealAt + 3000);
  const activeStep = STATUS_STEPS.slice().reverse().find((step) => elapsedMs >= step.revealAt && elapsedMs < step.revealAt + 3000) ?? null;
  const showSlowHint = elapsedMs >= 30000;
  const showLongHint = elapsedMs >= 50000;

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-6 pt-28 text-foreground md:pt-32">
      <div className="w-full max-w-xl space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent-teal">Synthesis</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Building your ICP Draft...</h1>
        </div>

        <div className="space-y-3 rounded-5xl border border-border/60 bg-white/80 p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur dark:bg-slate-950/70">
          {completedSteps.map((step) => (
            <div key={step.label} className="flex items-center gap-3 text-sm sm:text-base">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-accent-teal" />
              <span className="text-foreground/70">{step.label}</span>
            </div>
          ))}

          {activeStep ? (
            <div className="flex items-center gap-3 text-sm font-medium sm:text-base">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-accent-teal" />
              <span>{activeStep.label}...</span>
            </div>
          ) : null}

          {showSlowHint && !showLongHint ? (
            <p className="pt-1 text-sm text-muted-foreground">Almost there — we're being thorough.</p>
          ) : null}

          {showLongHint ? (
            fallbackState === "submitted" ? (
              <div className="rounded-3xl border border-success/25 bg-success/10 px-4 py-4 text-sm text-success dark:text-success">
                We&apos;ll email you a link to resume and unlock this ICP Draft as soon as it&apos;s ready.
              </div>
            ) : (
              <div className="space-y-3 rounded-3xl border border-border/60 bg-background/70 p-4">
                <p className="text-sm text-muted-foreground">
                  This is taking longer than usual. Add your email and we&apos;ll send you a link to resume and unlock the draft later.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    type="email"
                    value={fallbackEmail}
                    placeholder="you@company.com"
                    onChange={(event) => onFallbackEmailChange(event.target.value)}
                    className="h-11 rounded-xl border-border/60 bg-white/85 dark:bg-slate-950/70"
                  />
                  <Button
                    type="button"
                    className="h-11 shrink-0 gap-2"
                    disabled={fallbackState === "submitting"}
                    onClick={() => void onFallbackEmailSubmit()}
                  >
                    {fallbackState === "submitting" ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4" />
                        Email me the draft
                      </>
                    )}
                  </Button>
                </div>
                {fallbackEmailError ? <p className="text-sm text-destructive">{fallbackEmailError}</p> : null}
              </div>
            )
          ) : null}
        </div>
      </div>
    </div>
  );
}
