import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { getSessionSafely } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { mapSignUpError } from "@/lib/authErrors";
import {
  trackLandingViewed,
  trackSignupCompleted,
  trackSignupStarted,
  trackSoftGateShown,
} from "@/lib/analytics";
import { persistOnboardingReturn } from "@/lib/authRedirect";
import { buildIcpSeedReturnPath, normalizeIcpSeed, persistIcpSeed } from "@/lib/icpSeed";
import { MIN_PASSWORD_LENGTH, PASSWORD_LENGTH_ERROR } from "@/lib/passwordPolicy";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface SoftGateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  seed?: string;
  trigger: string;
  title?: string;
  description?: string;
  returnPathOverride?: string;
  onBeforeAuthContinue?: () => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SoftGateModal = ({
  open,
  onOpenChange,
  seed = "",
  trigger,
  title = "Save your ICP and keep building",
  description = "Create your founder profile in 10 seconds. Free forever. No credit card.",
  returnPathOverride,
  onBeforeAuthContinue,
}: SoftGateModalProps) => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const ignoreDismissTrackingRef = useRef(false);
  const hasTrackedOpenRef = useRef(false);

  const normalizedSeed = useMemo(() => normalizeIcpSeed(seed), [seed]);
  const returnPath = useMemo(
    () => returnPathOverride || buildIcpSeedReturnPath(normalizedSeed),
    [normalizedSeed, returnPathOverride],
  );

  useEffect(() => {
    if (!open) {
      hasTrackedOpenRef.current = false;
      return;
    }

    if (hasTrackedOpenRef.current) {
      return;
    }

    trackSoftGateShown({ trigger });
    hasTrackedOpenRef.current = true;
  }, [open, trigger]);

  const closeWithoutExitTracking = () => {
    ignoreDismissTrackingRef.current = true;
    onOpenChange(false);
  };

  const handleDismiss = () => {
    if (ignoreDismissTrackingRef.current) {
      ignoreDismissTrackingRef.current = false;
      onOpenChange(false);
      return;
    }

    trackLandingViewed({ page: "/", exit_intent: true });
    onOpenChange(false);
  };

  const handleGoogleContinue = async () => {
    try {
      trackSignupStarted({ method: "google" });
      onBeforeAuthContinue?.();
      persistIcpSeed(normalizedSeed);
      persistOnboardingReturn(returnPath);
      localStorage.setItem("oauth_return_url", returnPath);
      localStorage.setItem("oauth_source", trigger);
      localStorage.setItem("oauth_signup_method", "google");

      toast("Redirecting to Google...");

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
        console.error("Google OAuth error:", error);
        toast.error(`Google sign-up error: ${error.message}`);
      }
    } catch (error) {
      console.error("Google OAuth sign-up failed", error);
      toast.error(`Google sign-up failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleEmailSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      nextErrors.email = "Email is required";
    } else if (!emailRegex.test(email)) {
      nextErrors.email = "Please enter a valid email address";
    }

    if (!password.trim()) {
      nextErrors.password = "Password is required";
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      nextErrors.password = PASSWORD_LENGTH_ERROR;
    }

    setErrors(nextErrors);
    if (nextErrors.email || nextErrors.password) {
      return;
    }

    setIsLoading(true);

    try {
      trackSignupStarted({ method: "email" });
      onBeforeAuthContinue?.();
      persistIcpSeed(normalizedSeed);
      persistOnboardingReturn(returnPath);

      const { error } = await signUp(email.trim(), password, "");
      if (error) {
        toast.error(mapSignUpError(error));
        return;
      }

      let session = await getSessionSafely();
      if (!session) {
        const { error: autoSignInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (autoSignInError) {
          toast.error("Account created, but automatic sign in failed. Please sign in manually.");
          navigate(
            `/login?source=soft-gate-email&return=${encodeURIComponent(returnPath)}`,
            { replace: true },
          );
          return;
        }

        session = await getSessionSafely();
      }

      if (!session) {
        toast.error("Account created, but session initialization is delayed. Please sign in.");
        navigate(
          `/login?source=soft-gate-email&return=${encodeURIComponent(returnPath)}`,
          { replace: true },
        );
        return;
      }

      trackSignupCompleted({ method: "email" });
      closeWithoutExitTracking();
      navigate(returnPath, { replace: true });
    } catch (error) {
      console.error("Soft-gate email signup failed", error);
      toast.error(error instanceof Error ? error.message : "Sign-up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : handleDismiss())}>
      <DialogContent className="max-w-md overflow-hidden border border-border/60 bg-background/96 p-0 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.45)]">
        <div className="relative px-6 pb-6 pt-7 sm:px-7">
          <button
            aria-label="Close"
            className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={handleDismiss}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>

          <DialogHeader className="space-y-3 text-left">
            <DialogTitle className="pr-10 text-2xl font-semibold tracking-tight">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-muted-foreground">
              {description}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 space-y-3">
            <Button
              className="h-12 w-full text-base font-semibold"
              disabled={isLoading}
              onClick={() => void handleGoogleContinue()}
              type="button"
            >
              Continue with Google
            </Button>

            <button
              className="w-full px-2 py-2 text-sm font-medium text-primary transition-opacity hover:opacity-80"
              disabled={isLoading}
              onClick={() => setShowEmailForm((previous) => !previous)}
              type="button"
            >
              Use email instead
            </button>
          </div>

          {showEmailForm ? (
            <form className="mt-4 space-y-3 rounded-2xl border border-border/60 bg-muted/25 p-4" onSubmit={handleEmailSubmit}>
              <div className="space-y-2">
                <Input
                  autoComplete="email"
                  disabled={isLoading}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email) {
                      setErrors((previous) => ({ ...previous, email: undefined }));
                    }
                  }}
                  placeholder="you@company.com"
                  type="email"
                  value={email}
                />
                {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
              </div>

              <div className="space-y-2">
                <Input
                  autoComplete="new-password"
                  disabled={isLoading}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password) {
                      setErrors((previous) => ({ ...previous, password: undefined }));
                    }
                  }}
                  placeholder="Create a password"
                  type="password"
                  value={password}
                />
                {errors.password ? <p className="text-sm text-destructive">{errors.password}</p> : null}
              </div>

              <Button className="h-11 w-full font-semibold" disabled={isLoading} type="submit">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Continue with email"
                )}
              </Button>
            </form>
          ) : null}

          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
            We'll never post anything. Unsubscribe anytime.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SoftGateModal;
