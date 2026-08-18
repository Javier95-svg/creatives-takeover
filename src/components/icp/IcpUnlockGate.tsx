import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Lock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { persistOnboardingReturn } from "@/lib/authRedirect";
import { normalizeIcpSeed, persistIcpSeed } from "@/lib/icpSeed";
import {
  trackICPLoginClicked,
  trackICPUnlockClicked,
  trackICPUnlockGateShown,
} from "@/lib/analytics";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";
import { trackActivationFunnelEvent } from "@/lib/activationEntry";

// Mirrors GUEST_LOCKED_SECTIONS in IcpGuestResultView plus the decision brief,
// which the folio moves behind the gate alongside them.
const UNLOCKS = [
  "What you are building, and what it replaces",
  "Your moat and the competitive landscape",
  "Who to serve first and what to validate",
] as const;

interface IcpUnlockGateProps {
  artifact: StoredIcpArtifact;
  seed?: string;
  returnPath: string;
  onBeforeAuthContinue?: () => void;
  onEmailLinkRequest?: (email: string) => Promise<void>;
  onDismiss?: () => void;
  className?: string;
}

export function IcpUnlockGate({
  artifact,
  seed = "",
  returnPath,
  onBeforeAuthContinue,
  onEmailLinkRequest,
  onDismiss,
  className = "",
}: IcpUnlockGateProps) {
  const navigate = useNavigate();
  const normalizedSeed = useMemo(() => normalizeIcpSeed(seed), [seed]);


  useEffect(() => {
    trackICPUnlockGateShown({
      page_path: "/icp-builder",
      has_seed: Boolean(normalizedSeed),
      confidence: artifact.draftDocument.confidence.level,
      layout: "inline",
      // Nothing is locked any more. Kept (rather than dropped) so the event
      // shape stays stable and before/after is comparable in PostHog.
      locked_after: "none",
    });
    trackActivationFunnelEvent("activation_gate_shown", {
      entry_id: "icp_draft_unlock",
      tool: "icp_builder",
      source: "icp-draft-unlock",
      step: "signup_gate",
      is_authenticated: false,
      return_path: returnPath,
    });
  }, [artifact.draftDocument.confidence.level, normalizedSeed, returnPath]);

  /**
   * One route to an account. The gate previously offered Google and email as
   * co-equal buttons, which made the highest-intent moment in the funnel a
   * choice rather than an action.
   *
   * Event names are unchanged so before/after stays comparable in PostHog.
   */
  const handleCreateAccount = () => {
    trackICPUnlockClicked({
      page_path: "/icp-builder",
      method: "email",
      surface: "inline_lock_block",
    });
    trackActivationFunnelEvent("activation_gate_clicked", {
      entry_id: "icp_draft_unlock", tool: "icp_builder", source: "icp-draft-unlock",
      step: "signup_email", is_authenticated: false, return_path: returnPath,
    });
    onBeforeAuthContinue?.();
    persistIcpSeed(normalizedSeed);
    persistOnboardingReturn(returnPath);
    navigate(`/signup?source=icp-draft-unlock&return=${encodeURIComponent(returnPath)}`);
  };

  const handleLoginRedirect = () => {
    trackICPLoginClicked({
      page_path: "/icp-builder",
      source: "inline_lock_block",
    });
    onBeforeAuthContinue?.();
    persistIcpSeed(normalizedSeed);
    persistOnboardingReturn(returnPath);
    navigate(`/login?source=icp-draft-unlock&return=${encodeURIComponent(returnPath)}`);
  };

  return (
    <div className={`relative z-20 w-full ${className}`}>
      {/*
        Narrower and more emphatic than the surrounding document: this is the
        one element on the page that asks for something, so it should read as a
        card sitting on top of the draft rather than another section of it.
      */}
      <div className="mx-auto w-full max-w-xl overflow-hidden rounded-3xl border border-primary/25 bg-background shadow-[0_24px_70px_-40px_hsl(var(--primary)/0.5)]">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent-teal to-primary" aria-hidden="true" />
        {onDismiss ? (
          <div className="flex justify-end px-6 pt-4 sm:px-8">
            <button
              type="button"
              aria-label="Close unlock prompt"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={onDismiss}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        <div className="px-6 py-8 sm:px-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10">
            <Lock className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>

          <div className="mt-5 space-y-2 text-center">
            <h2 className="text-2xl font-semibold tracking-tight">
              The rest of your brief is ready
            </h2>
            <p className="mx-auto max-w-sm text-sm leading-6 text-muted-foreground">
              Create a free account to unlock the full draft and keep it saved to your profile.
            </p>
          </div>

          {/* Names what is behind the blur. A gate that does not say what it
              is withholding reads as a paywall rather than an offer. */}
          <ul className="mx-auto mt-6 max-w-sm space-y-2.5">
            {UNLOCKS.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-foreground">
                <Check className="mt-1 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <Button
            type="button"
            className="mt-7 h-14 w-full text-base font-semibold"
            onClick={handleCreateAccount}
          >
            Create your account for free
          </Button>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            No credit card. Your draft saves to your account automatically.
          </p>

          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm font-medium text-primary transition-opacity hover:opacity-80"
              onClick={handleLoginRedirect}
            >
              I already have an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
