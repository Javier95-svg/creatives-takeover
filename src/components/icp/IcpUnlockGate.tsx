import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Mail, Users, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const [resumeEmail, setResumeEmail] = useState("");
  const [resumeEmailError, setResumeEmailError] = useState<string | null>(null);
  const [resumeEmailState, setResumeEmailState] = useState<"idle" | "submitting" | "submitted">("idle");

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

  const handleResumeEmailSubmit = async () => {
    if (!onEmailLinkRequest || resumeEmailState === "submitting" || resumeEmailState === "submitted") {
      return;
    }

    setResumeEmailError(null);
    setResumeEmailState("submitting");

    try {
      await onEmailLinkRequest(resumeEmail);
      setResumeEmailState("submitted");
    } catch (error) {
      setResumeEmailState("idle");
      const message = error instanceof Error ? error.message : "We could not send the resume link.";
      setResumeEmailError(message);
      toast.error(message);
    }
  };

  return (
    <div className={`relative z-20 w-full ${className}`}>
      <div className="w-full rounded-[2rem] border border-border/60 bg-white/95 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.45)] backdrop-blur dark:bg-slate-950/90 sm:overflow-hidden">
        <div className="border-b border-border/50 px-6 py-5 sm:px-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#32b8c6]">
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
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#32b8c6]">What you already unlocked</p>
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
              Unlock the rest of your ICP Draft
            </h2>
            <p className="text-sm text-muted-foreground">
              You already saw who this is for and why they care. Create a free account to reveal what to build next, your competitive edge, and the full draft.
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
                  Unlocking with Google...
                </>
              ) : (
                "Unlock full draft with Google"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full text-base font-semibold"
              disabled={isGoogleLoading}
              onClick={handleSignUpRedirect}
            >
              Unlock full draft with email
            </Button>
          </div>

          <p className="mt-3 text-center text-xs text-muted-foreground">
            Free forever. No credit card. Your draft will be saved to your account.
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

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Not ready? Your draft is saved in this browser — come back anytime.
          </p>

          <div className="mt-4 rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
            <p className="text-sm font-medium text-foreground">Need to come back on another device?</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Send yourself a resume link and pick this exact draft back up later.
            </p>
            {resumeEmailState === "submitted" ? (
              <div className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
                We&apos;ll email you a link to resume and unlock this draft.
              </div>
            ) : (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  value={resumeEmail}
                  onChange={(event) => {
                    setResumeEmail(event.target.value);
                    if (resumeEmailError) {
                      setResumeEmailError(null);
                    }
                  }}
                  placeholder="you@company.com"
                  className="h-11 rounded-xl border-border/60 bg-white/85 dark:bg-slate-950/70"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 gap-2"
                  disabled={!onEmailLinkRequest || resumeEmailState === "submitting"}
                  onClick={() => void handleResumeEmailSubmit()}
                >
                  {resumeEmailState === "submitting" ? (
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
            )}
            {resumeEmailError ? <p className="mt-2 text-sm text-destructive">{resumeEmailError}</p> : null}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>Joined by 3,200+ founders building from sharper customer insight.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
