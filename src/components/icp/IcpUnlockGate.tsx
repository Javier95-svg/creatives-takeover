import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, X } from "lucide-react";
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
