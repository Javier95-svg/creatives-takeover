import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LockKeyhole } from "lucide-react";
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
  artifact: _artifact,
  seed = "",
  returnPath,
  onBeforeAuthContinue,
  className = "",
}: IcpUnlockGateProps) {
  const navigate = useNavigate();
  const normalizedSeed = useMemo(() => normalizeIcpSeed(seed), [seed]);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

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
      <div className="w-full rounded-[2rem] border border-border/60 bg-white/80 p-6 shadow-[0_34px_120px_-55px_rgba(15,23,42,0.45)] backdrop-blur dark:bg-slate-950/75 sm:p-8">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f7fa] text-[#0f5b64] dark:bg-[#0f5b64]/20 dark:text-[#8fe6ef]">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">Your ICP Draft is ready.</h1>
          <p className="text-sm leading-relaxed text-muted-foreground sm:text-base">
            Create your account to unlock the full draft and keep working from this exact point.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          <Button
            type="button"
            className="h-12 w-full text-base font-semibold"
            disabled={isGoogleLoading}
            onClick={handleSignUpRedirect}
          >
            Sign Up to unlock
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full text-base font-semibold"
            disabled={isGoogleLoading}
            onClick={() => void handleGoogleContinue()}
          >
            {isGoogleLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Continue with Google
              </>
            ) : (
              "Continue with Google"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
