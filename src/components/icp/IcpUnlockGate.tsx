import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Loader2, LockKeyhole, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getSafeLocalStorage } from "@/lib/safeStorage";
import { persistOnboardingReturn } from "@/lib/authRedirect";
import { normalizeIcpSeed, persistIcpSeed } from "@/lib/icpSeed";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";

interface IcpUnlockGateProps {
  artifact: StoredIcpArtifact;
  seed?: string;
  returnPath: string;
  onBeforeAuthContinue?: () => void;
  className?: string;
}

export function IcpUnlockGate({
  artifact,
  seed = "",
  returnPath,
  onBeforeAuthContinue,
  className = "",
}: IcpUnlockGateProps) {
  const navigate = useNavigate();
  const normalizedSeed = useMemo(() => normalizeIcpSeed(seed), [seed]);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const gatePreview = artifact.draftDocument.gatePreview;
  const personaName = gatePreview?.personaName || artifact.draftDocument.customer.personaName;
  const roleLine = gatePreview?.roleLine || artifact.draftDocument.customer.roleLine;
  const painLine = gatePreview?.painLine || artifact.draftDocument.pain.quote;

  const hoursRemaining = useMemo(() => {
    const generatedAt = artifact.generatedAt ? new Date(artifact.generatedAt).getTime() : Date.now();
    const expiresAt = generatedAt + 48 * 60 * 60 * 1000;
    return Math.max(1, Math.ceil((expiresAt - Date.now()) / (60 * 60 * 1000)));
  }, [artifact.generatedAt]);

  const handleGoogleContinue = async () => {
    try {
      setIsGoogleLoading(true);
      onBeforeAuthContinue?.();
      persistIcpSeed(normalizedSeed);
      persistOnboardingReturn(returnPath);
      const storage = getSafeLocalStorage();
      storage.setItem("oauth_return_url", returnPath);
      storage.setItem("oauth_source", "icp-draft-unlock");

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
    onBeforeAuthContinue?.();
    persistIcpSeed(normalizedSeed);
    persistOnboardingReturn(returnPath);
    navigate(`/sign-up?source=icp-draft-unlock&return=${encodeURIComponent(returnPath)}`);
  };

  return (
    <div className={`relative z-20 w-full ${className}`}>
      <div className="w-full rounded-[2rem] border border-border/60 bg-white/85 shadow-[0_34px_120px_-55px_rgba(15,23,42,0.45)] backdrop-blur dark:bg-slate-950/80 sm:overflow-hidden">
        {/* Draft teaser — readable excerpt from the generated report */}
        <div className="border-b border-border/50 px-6 py-5 sm:px-8">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#32b8c6]">
            Your ICP Draft — Preview
          </p>
          <p className="text-base font-semibold text-foreground">{personaName}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">{roleLine}</p>

          {painLine ? (
            <p className="mt-3 text-sm leading-6 text-foreground/80 italic">
              "{painLine}"
            </p>
          ) : null}

          {/* Blurred lower rows — signal that more is locked */}
          <div className="relative mt-4 overflow-hidden" aria-hidden="true">
            <div className="select-none blur-[4px]">
              <div className="mb-1.5 h-3 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
              <div className="mb-1.5 h-3 w-full rounded bg-slate-200 dark:bg-slate-700" />
              <div className="h-3 w-1/2 rounded bg-slate-200 dark:bg-slate-700" />
            </div>
            <div className="absolute inset-0 flex items-center justify-start">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/50 bg-white/90 px-3 py-1 text-[11px] font-semibold text-[#0f5b64] dark:bg-slate-900/90 dark:text-[#8fe6ef]">
                <LockKeyhole className="h-3 w-3" />
                +5 more sections locked
              </span>
            </div>
          </div>
        </div>

        {/* Gate CTAs */}
        <div className="px-6 py-6 sm:px-8">
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              Unlock the full draft — it's free
            </h2>
            <p className="text-sm text-muted-foreground">
              Create your account to save this draft and keep building from here.
            </p>
            <p className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              <Clock className="h-3 w-3 shrink-0" />
              Draft saved for {hoursRemaining}h — free account keeps it permanently
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
                  Continuing with Google...
                </>
              ) : (
                "Continue with Google"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full text-base font-semibold"
              disabled={isGoogleLoading}
              onClick={handleSignUpRedirect}
            >
              Sign up with email
            </Button>
          </div>

          {/* Social proof */}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 shrink-0" />
            <span>Joined by 3,200+ founders. Free forever. No credit card.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
