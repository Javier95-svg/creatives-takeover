import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getSafeLocalStorage } from "@/lib/safeStorage";
import { persistOnboardingReturn } from "@/lib/authRedirect";
import { normalizeIcpSeed, persistIcpSeed } from "@/lib/icpSeed";
import {
  persistAuthMethod,
  trackICPLoginClicked,
  trackICPUnlockClicked,
  trackICPUnlockGateShown,
} from "@/lib/analytics";
import {
  getPendingReferralCode,
  persistPendingReferralCode,
  setOAuthAuthIntent,
} from "@/lib/referral";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";

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

  const gatePreview = artifact.draftDocument.gatePreview;
  const personaName = gatePreview?.personaName || artifact.draftDocument.customer.personaName;
  const roleLine = gatePreview?.roleLine || artifact.draftDocument.customer.roleLine;
  const painLine = gatePreview?.painLine || artifact.draftDocument.pain.quote;
  const customerSummary = artifact.draftDocument.customer.summary;

  useEffect(() => {
    trackICPUnlockGateShown({
      page_path: "/icp-builder",
      has_seed: Boolean(normalizedSeed),
      confidence: artifact.draftDocument.confidence.level,
      layout: "inline",
      locked_after: "pain",
    });
  }, [artifact.draftDocument.confidence.level, normalizedSeed]);

  const handleGoogleContinue = async () => {
    try {
      trackICPUnlockClicked({
        page_path: "/icp-builder",
        method: "google",
        surface: "inline_lock_block",
      });
      setIsGoogleLoading(true);
      persistAuthMethod("google");
      onBeforeAuthContinue?.();
      persistIcpSeed(normalizedSeed);
      persistOnboardingReturn(returnPath);
      const storage = getSafeLocalStorage();
      storage.setItem("oauth_return_url", returnPath);
      storage.setItem("oauth_source", "icp-draft-unlock");
      storage.setItem("oauth_signup_method", "google");
      setOAuthAuthIntent("signup");
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

  const handleSignUpRedirect = () => {
    trackICPUnlockClicked({
      page_path: "/icp-builder",
      method: "email",
      surface: "inline_lock_block",
    });
    onBeforeAuthContinue?.();
    persistIcpSeed(normalizedSeed);
    persistOnboardingReturn(returnPath);
    navigate(`/sign-up?source=icp-draft-unlock&return=${encodeURIComponent(returnPath)}`);
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
      <div className="w-full rounded-[2rem] border border-border/60 bg-white/95 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.45)] backdrop-blur dark:bg-slate-950/90 sm:overflow-hidden">
        <div className="border-b border-border/50 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-3 text-caption font-semibold uppercase tracking-[0.22em] text-accent-teal">
                Preview ready
              </p>
              <p className="text-base font-semibold text-foreground">{personaName}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{roleLine}</p>
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

          <div className="mt-4 rounded-[1.5rem] border border-border/60 bg-background/70 px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent-teal">What you already unlocked</p>
            <p className="mt-2 text-sm leading-6 text-foreground">{customerSummary}</p>
            {painLine ? (
              <p className="mt-3 text-sm leading-6 text-foreground/80 italic">
                "{painLine}"
              </p>
            ) : null}
          </div>

        </div>

        <div className="px-6 py-6 sm:px-8">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              You know who. Now see exactly what to build for them.
            </h2>
            <p className="text-sm text-muted-foreground">
              Sign up free to unlock the core pain, the build plan, and your competitive edge — all tailored to your idea.
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

          <div className="mt-5 rounded-[1.5rem] border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex shrink-0 text-amber-400">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <div>
                <p className="text-sm leading-6 text-foreground">
                  "I typed two sentences about my idea and it gave me the exact customer profile I'd been struggling to write for weeks."
                </p>
                <p className="mt-1 text-xs text-muted-foreground">— James K., B2B SaaS founder</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
