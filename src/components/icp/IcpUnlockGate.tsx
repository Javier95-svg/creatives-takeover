import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ExternalLink, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { persistOnboardingReturn } from "@/lib/authRedirect";
import { normalizeIcpSeed, persistIcpSeed } from "@/lib/icpSeed";
import {
  trackICPLoginClicked,
  trackICPUnlockClicked,
  trackICPUnlockGateShown,
} from "@/lib/analytics";
import {
  getPendingReferralCode,
  persistPendingReferralCode,
} from "@/lib/referral";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";
import { beginAttributedOAuthSignup } from "@/lib/signupAttribution";
import { trackActivationFunnelEvent } from "@/lib/activationEntry";
import SoftGateModal from "@/components/auth/SoftGateModal";

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [softGateOpen, setSoftGateOpen] = useState(false);

  const confidence = artifact.draftDocument.confidence;
  const citedSignal = artifact.draftDocument.sources?.find((source) => Boolean(source.url));
  const customerEvidence = artifact.draftDocument.customer.evidence;
  const painEvidence = artifact.draftDocument.pain.evidence;
  const fallbackSignal =
    artifact.draftDocument.customer.evidence.evidence ||
    artifact.draftDocument.pain.evidence.evidence;
  const fallbackProvenance =
    customerEvidence.provenance === "founder_input" || painEvidence.provenance === "founder_input"
      ? "Founder hypothesis"
      : "Model inference — validate this";
  const assumptions = confidence.missingSignals.slice(0, 2);

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

  const handleGoogleContinue = async () => {
    try {
      trackICPUnlockClicked({
        page_path: "/icp-builder",
        method: "google",
        surface: "inline_lock_block",
      });
      trackActivationFunnelEvent("activation_gate_clicked", {
        entry_id: "icp_draft_unlock", tool: "icp_builder", source: "icp-draft-unlock",
        step: "signup_google", is_authenticated: false, return_path: returnPath,
      });
      setIsGoogleLoading(true);
      onBeforeAuthContinue?.();
      persistIcpSeed(normalizedSeed);
      beginAttributedOAuthSignup({
        method: "google",
        source: "icp-draft-unlock",
        returnUrl: returnPath,
        entryId: "icp_draft_unlock",
      });
      const pendingReferralCode = getPendingReferralCode();
      if (pendingReferralCode) {
        persistPendingReferralCode(pendingReferralCode);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "select_account",
          },
        },
      });

      if (error) {
        toast.error(`Google sign-up error: ${error.message}`);
        setIsGoogleLoading(false);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-up failed.");
      setIsGoogleLoading(false);
    }
  };

  // Opens the 2-field modal in place instead of navigating to /signup (4 fields
  // plus a full page load). This is the highest-intent moment in the funnel —
  // the visitor is looking at their own half-unlocked draft — so the previous
  // behaviour of throwing away the page and asking for twice the input was the
  // worst possible trade. SoftGateModal returns them here via returnPath.
  const handleSignUpRedirect = () => {
    trackICPUnlockClicked({
      page_path: "/icp-builder",
      method: "email",
      surface: "inline_lock_block",
    });
    trackActivationFunnelEvent("activation_gate_clicked", {
      entry_id: "icp_draft_unlock", tool: "icp_builder", source: "icp-draft-unlock",
      step: "signup_email", is_authenticated: false, return_path: returnPath,
    });
    setSoftGateOpen(true);
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
      <div className="w-full rounded-5xl border border-border/60 bg-white/95 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.45)] backdrop-blur dark:bg-slate-950/90 sm:overflow-hidden">
        <div className="border-b border-border/50 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-3 text-caption font-semibold uppercase tracking-[0.22em] text-accent-teal">
                Evidence check
              </p>
              <p className="text-base font-semibold text-foreground">
                Know what is sourced, hypothesized, and inferred
              </p>
            </div>

            {onDismiss ? (
              <button
                type="button"
                aria-label="Close unlock prompt"
                className="inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={onDismiss}
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="mt-4 rounded-3xl border border-border/60 bg-background/70 px-4 py-4">
            {(citedSignal || fallbackSignal) ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {citedSignal ? "Cited market signal" : fallbackProvenance}
                </p>
                <p className="mt-1 text-sm leading-6 text-foreground">
                  {citedSignal?.detail || citedSignal?.title || fallbackSignal}
                  {citedSignal?.url ? (
                    <a
                      href={citedSignal.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-2 inline-flex items-center gap-1 font-medium text-primary hover:underline"
                    >
                      View source <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </p>
              </div>
            ) : null}

            {assumptions.length ? (
              <div className="mt-4 rounded-2xl border border-warning/30 bg-warning-subtle px-3 py-3">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                  <AlertCircle className="h-3.5 w-3.5" /> Assumptions to validate
                </p>
                <ul className="mt-2 space-y-1 text-sm leading-6 text-muted-foreground">
                  {assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}
                </ul>
              </div>
            ) : null}
            <p className="mt-4 border-t border-border/60 pt-4 text-sm text-muted-foreground">
              Confidence: <span className="font-semibold capitalize text-foreground">{confidence.level}</span>. {confidence.summary}
            </p>
          </div>

        </div>

        <div className="px-6 py-6 sm:px-8">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              Save this and keep going
            </h2>
            <p className="text-sm text-muted-foreground">
              Your draft is saved in this browser. Create a free account to keep it and move to the next step.
            </p>
          </div>

          <div className="mt-5 space-y-3">
            <Button
              type="button"
              className="h-12 w-full text-base font-semibold"
              disabled={isGoogleLoading}
              onClick={() => void handleGoogleContinue()}
            >
              {isGoogleLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing up...
                </>
              ) : (
                "Continue with Google — it's free"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full text-base font-semibold"
              disabled={isGoogleLoading}
              onClick={handleSignUpRedirect}
            >
              Sign up with email — it's free
            </Button>
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            No credit card. Your draft saves to your account automatically.
          </p>

          <div className="mt-4 text-center">
            <button
              type="button"
              className="text-sm font-medium text-primary transition-opacity hover:opacity-80"
              disabled={isGoogleLoading}
              onClick={handleLoginRedirect}
            >
              I already have an account
            </button>
          </div>
        </div>
      </div>

      <SoftGateModal
        open={softGateOpen}
        onOpenChange={setSoftGateOpen}
        seed={normalizedSeed}
        trigger="icp_draft_unlock"
        title="Save this and keep going"
        description="Two fields and this exact brief is yours, including five customer-interview tasks. Free, with no credit card."
        returnPathOverride={returnPath}
        signupSource="icp-draft-unlock"
        entryId="icp_draft_unlock"
        activationTool="icp_builder"
        journeyTool="icp_builder"
        artifactType="customer_decision_preview"
        onBeforeAuthContinue={onBeforeAuthContinue}
      />
    </div>
  );
}
