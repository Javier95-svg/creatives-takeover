import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSessionSafely } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { mapSignUpError } from "@/lib/authErrors";
import { persistOnboardingReturn } from "@/lib/authRedirect";
import { normalizeIcpSeed, persistIcpSeed } from "@/lib/icpSeed";
import { MIN_PASSWORD_LENGTH, PASSWORD_LENGTH_ERROR } from "@/lib/passwordPolicy";
import type { StoredIcpArtifact } from "@/lib/icpBuilderSession";

interface IcpUnlockGateProps {
  artifact: StoredIcpArtifact;
  seed?: string;
  returnPath: string;
  onBeforeAuthContinue?: () => void;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function IcpUnlockGate({
  artifact,
  seed = "",
  returnPath,
  onBeforeAuthContinue,
}: IcpUnlockGateProps) {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const normalizedSeed = useMemo(() => normalizeIcpSeed(seed), [seed]);

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const preview = artifact.draftDocument.gatePreview;

  const handleGoogleContinue = async () => {
    try {
      onBeforeAuthContinue?.();
      persistIcpSeed(normalizedSeed);
      persistOnboardingReturn(returnPath);
      localStorage.setItem("oauth_return_url", returnPath);
      localStorage.setItem("oauth_source", "icp-draft-unlock");

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
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-up failed.");
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
    if (nextErrors.email || nextErrors.password) return;

    setIsLoading(true);

    try {
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
          navigate(`/login?source=icp-draft-unlock&return=${encodeURIComponent(returnPath)}`, { replace: true });
          return;
        }

        session = await getSessionSafely();
      }

      if (!session) {
        toast.error("Account created, but session initialization is delayed. Please sign in.");
        navigate(`/login?source=icp-draft-unlock&return=${encodeURIComponent(returnPath)}`, { replace: true });
        return;
      }

      navigate(returnPath, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Sign-up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative z-20 mx-auto flex w-full max-w-xl items-center justify-center px-4 py-10">
      <div className="w-full rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_34px_120px_-55px_rgba(15,23,42,0.45)] sm:p-8">
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#e6f7fa] text-[#0f5b64]">
            <LockKeyhole className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.75rem]">Your ICP Draft is ready.</h1>
        </div>

        <div className="mt-6 rounded-[1.6rem] border border-slate-200 bg-slate-50 p-5 text-left">
          <p className="text-base font-semibold text-slate-900">👤 "{preview.personaName}"</p>
          <p className="mt-2 text-sm text-slate-600">{preview.roleLine}</p>
          <p className="mt-3 text-sm font-medium text-slate-900">Core pain: "{preview.painLine}"</p>
        </div>

        <div className="mt-6 space-y-3">
          <div className="rounded-2xl bg-[#32b8c6] px-4 py-4 text-center text-base font-semibold text-white">
            Unlock my ICP Draft — free
          </div>

          <Button
            type="button"
            className="h-12 w-full text-base font-semibold"
            disabled={isLoading}
            onClick={() => void handleGoogleContinue()}
          >
            Continue with Google
          </Button>

          <Button
            type="button"
            variant="outline"
            className="h-12 w-full text-base font-semibold"
            disabled={isLoading}
            onClick={() => setShowEmailForm((previous) => !previous)}
          >
            Sign up with email
          </Button>
        </div>

        {showEmailForm ? (
          <form className="mt-4 space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" onSubmit={handleEmailSubmit}>
            <div className="space-y-2">
              <Input
                autoComplete="email"
                disabled={isLoading}
                value={email}
                type="email"
                placeholder="you@company.com"
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (errors.email) {
                    setErrors((previous) => ({ ...previous, email: undefined }));
                  }
                }}
              />
              {errors.email ? <p className="text-sm text-destructive">{errors.email}</p> : null}
            </div>

            <div className="space-y-2">
              <Input
                autoComplete="new-password"
                disabled={isLoading}
                value={password}
                type="password"
                placeholder="Create a password"
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (errors.password) {
                    setErrors((previous) => ({ ...previous, password: undefined }));
                  }
                }}
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
                "Unlock with email"
              )}
            </Button>
          </form>
        ) : null}

        <p className="mt-5 text-center text-sm text-slate-500">Join 170+ founders building on Creatives Takeover</p>
      </div>
    </div>
  );
}
