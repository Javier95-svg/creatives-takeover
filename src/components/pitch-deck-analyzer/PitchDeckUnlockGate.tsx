import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, Star, FileSearch, ListChecks, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { getSafeLocalStorage } from '@/lib/safeStorage';
import { persistOnboardingReturn } from '@/lib/authRedirect';
import { captureEvent } from '@/lib/analytics';
import { getPendingReferralCode, persistPendingReferralCode, setOAuthAuthIntent } from '@/lib/referral';

interface PitchDeckUnlockGateProps {
  returnPath: string;
}

const SOURCE = 'pitch-deck-unlock';

// Sign-up gate shown directly below the free Quick Score. Creating an account
// unlocks the Full Investor Audit, and (because the deck is carried over in
// sessionStorage) the deep analysis runs on the same deck with no re-upload.
export function PitchDeckUnlockGate({ returnPath }: PitchDeckUnlockGateProps) {
  const navigate = useNavigate();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    captureEvent('free_tool_signup_gate_shown', { tool: 'pitch_deck_analyzer' });
  }, []);

  const handleGoogleContinue = async () => {
    try {
      captureEvent('free_tool_signup_gate_cta_clicked', { tool: 'pitch_deck_analyzer', method: 'google' });
      setIsGoogleLoading(true);
      persistOnboardingReturn(returnPath);
      const storage = getSafeLocalStorage();
      storage.setItem('oauth_return_url', returnPath);
      storage.setItem('oauth_source', SOURCE);
      storage.setItem('oauth_signup_method', 'google');
      setOAuthAuthIntent('signup');
      const pendingReferralCode = getPendingReferralCode();
      if (pendingReferralCode) persistPendingReferralCode(pendingReferralCode);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: 'offline', prompt: 'select_account' },
        },
      });
      if (error) {
        toast.error(`Google sign-up error: ${error.message}`);
        setIsGoogleLoading(false);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Google sign-up failed.');
      setIsGoogleLoading(false);
    }
  };

  const handleSignUpRedirect = () => {
    captureEvent('free_tool_signup_gate_cta_clicked', { tool: 'pitch_deck_analyzer', method: 'email' });
    persistOnboardingReturn(returnPath);
    navigate(`/sign-up?source=${SOURCE}&return=${encodeURIComponent(returnPath)}`);
  };

  const handleLoginRedirect = () => {
    captureEvent('free_tool_login_clicked', { tool: 'pitch_deck_analyzer' });
    persistOnboardingReturn(returnPath);
    navigate(`/login?source=${SOURCE}&return=${encodeURIComponent(returnPath)}`);
  };

  return (
    <div className="relative z-20 w-full max-w-5xl mx-auto">
      <div className="w-full rounded-3xl border border-border/60 bg-card/95 shadow-[0_30px_90px_-60px_rgba(15,23,42,0.45)] backdrop-blur">
        <div className="border-b border-border/50 px-6 py-5 sm:px-8">
          <p className="mb-2 inline-flex items-center gap-2 text-caption font-semibold uppercase tracking-[0.18em] text-accent-teal">
            <Lock className="h-3.5 w-3.5" />
            Full Investor Audit
          </p>
          <h2 className="text-xl font-semibold tracking-tight">
            You have your score. Now see exactly how to raise it.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign up free to unlock the deep audit on this same deck — no re-upload, your first
            analysis is on us.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { icon: FileSearch, label: 'Per-slide findings with evidence quotes from your deck' },
              { icon: ListChecks, label: 'Missing-slide checklist + narrative-flow review' },
              { icon: Target, label: 'Prioritized action plan + funded-deck benchmark' },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-start gap-2 rounded-2xl border border-border/60 bg-background/70 px-3 py-3">
                <Icon className="h-4 w-4 shrink-0 text-accent-teal mt-0.5" />
                <p className="text-xs leading-5 text-foreground">{label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-6 sm:px-8">
          <div className="space-y-3">
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
            No credit card. Your Quick Score saves to your account automatically.
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

          <div className="mt-5 rounded-2xl border border-border/50 bg-background/60 px-4 py-4">
            <div className="flex items-start gap-3">
              <div className="flex shrink-0 text-warning">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-current" />
                ))}
              </div>
              <div>
                <p className="text-sm leading-6 text-foreground">
                  "The slide-by-slide breakdown caught three things our advisor missed. We reordered
                  the deck and closed our round."
                </p>
                <p className="mt-1 text-xs text-muted-foreground">— Priya M., seed-stage founder</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
