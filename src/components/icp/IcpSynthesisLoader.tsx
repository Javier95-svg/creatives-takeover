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

const STATUS_STEPS = [
  "Identifying your ideal customer",
  "Mapping their core frustration",
  "Defining your product direction",
];

export function IcpSynthesisLoader({
  elapsedMs,
  fallbackEmail,
  fallbackEmailError = null,
  fallbackState = "idle",
  onFallbackEmailChange,
  onFallbackEmailSubmit,
}: IcpSynthesisLoaderProps) {
  const visibleSteps = STATUS_STEPS.filter((_, index) => elapsedMs >= index * 800);
  const finalStepVisible = elapsedMs >= 2400;
  const showSlowHint = elapsedMs >= 8000;
  const showLongHint = elapsedMs >= 15000;

  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent px-6 pt-28 text-foreground md:pt-32">
      <div className="w-full max-w-xl space-y-8">
        <div className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#32b8c6]">Synthesis</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Building your ICP Draft...</h1>
        </div>

        <div className="space-y-4 rounded-[2rem] border border-border/60 bg-white/80 p-6 shadow-[0_28px_80px_-48px_rgba(15,23,42,0.35)] backdrop-blur dark:bg-slate-950/70">
          {visibleSteps.map((label) => (
            <div key={label} className="flex items-center gap-3 text-sm sm:text-base">
              <CheckCircle2 className="h-5 w-5 text-[#32b8c6]" />
              <span>{label}</span>
            </div>
          ))}

          {finalStepVisible ? (
            <div className="flex items-center gap-3 text-sm sm:text-base">
              <Loader2 className="h-5 w-5 animate-spin text-[#32b8c6]" />
              <span>Analysing your startup moat...</span>
            </div>
          ) : null}

          {showSlowHint ? (
            <p className="pt-2 text-sm text-muted-foreground">Almost there — we're being thorough.</p>
          ) : null}

          {showLongHint ? (
            fallbackState === "submitted" ? (
              <div className="rounded-[1.5rem] border border-emerald-500/25 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-800 dark:text-emerald-300">
                We&apos;ll email you a link to resume and unlock this ICP Draft as soon as it&apos;s ready.
              </div>
            ) : (
              <div className="space-y-3 rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
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
