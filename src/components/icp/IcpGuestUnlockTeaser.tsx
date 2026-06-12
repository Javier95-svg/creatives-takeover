import { Compass, Shield, Sparkles, Zap } from "lucide-react";

import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";

interface IcpGuestUnlockTeaserProps {
  artifact: StoredIcpArtifact;
  className?: string;
}

function firstSentence(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(.{20,160}?[.!?])(\s|$)/);
  if (match) return match[1];
  return trimmed.length > 160 ? `${trimmed.slice(0, 157)}…` : trimmed;
}

export function IcpGuestUnlockTeaser({ artifact, className = "" }: IcpGuestUnlockTeaserProps) {
  const painQuote = firstSentence(artifact.draftDocument.pain.quote);
  const buildOutcome = firstSentence(artifact.draftDocument.build.outcome);
  const buildValue = firstSentence(artifact.draftDocument.build.valueProposition);
  const moatEdge = firstSentence(artifact.draftDocument.moat.edge);
  const moatType = artifact.draftDocument.moat.moatType?.trim();

  const painLine = painQuote
    ? `"${painQuote}"`
    : "The exact pain driving your customer to act — and the trigger moment that makes them buy.";
  const buildLine = buildOutcome || buildValue || "The exact value proposition and core features tailored to this customer.";
  const moatLine = moatEdge
    || (moatType ? `Why ${moatType.toLowerCase()} is the durable edge for this idea.` : null)
    || "Your defensible edge and how to keep incumbents from catching up.";

  return (
    <section
      aria-label="What unlocks after signup"
      className={`mt-6 overflow-hidden rounded-5xl border border-border/60 bg-gradient-to-br from-[#f5fdfe] via-white to-[#eef8fa] p-6 shadow-[0_24px_80px_-60px_rgba(15,23,42,0.35)] dark:from-slate-950/80 dark:via-slate-950/60 dark:to-slate-900/60 sm:p-8 ${className}`}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-accent-teal" aria-hidden="true" />
        <p className="text-label font-semibold uppercase tracking-[0.22em] text-[#0f5b64] dark:text-[#8fe6ef]">
          Unlocks after signup
        </p>
      </div>

      <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
        The pain, the build plan, and your competitive edge
      </h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        You&apos;ve seen who this customer is. Sign up free to unlock everything else — tailored to your specific idea.
      </p>

      <ul className="mt-5 space-y-3">
        <li className="flex items-start gap-3 rounded-2xl border border-border/50 bg-white/80 px-4 py-3 dark:bg-slate-950/60">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-teal/15 text-[#0f5b64] dark:text-[#8fe6ef]">
            <Zap className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Core pain point</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{painLine}</p>
          </div>
        </li>
        <li className="flex items-start gap-3 rounded-2xl border border-border/50 bg-white/80 px-4 py-3 dark:bg-slate-950/60">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-teal/15 text-[#0f5b64] dark:text-[#8fe6ef]">
            <Compass className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">What to build next</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{buildLine}</p>
          </div>
        </li>
        <li className="flex items-start gap-3 rounded-2xl border border-border/50 bg-white/80 px-4 py-3 dark:bg-slate-950/60">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-teal/15 text-[#0f5b64] dark:text-[#8fe6ef]">
            <Shield className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground">Moat &amp; competitive edge</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{moatLine}</p>
          </div>
        </li>
      </ul>
    </section>
  );
}
