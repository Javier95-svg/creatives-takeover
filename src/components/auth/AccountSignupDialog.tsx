import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Github, Mail, X, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ctLogoMark from '@/assets/ct-logo-polished-borders.webp';
import { startSocialOAuth } from '@/lib/socialAuth';
import { supabase } from '@/integrations/supabase/client';

/**
 * The three-way signup dialog: email, Google, GitHub.
 *
 * Lifted out of BuildPage, which owned the only copy, so the guided tour at
 * /demo can ask for an account with the same dialog rather than a lookalike
 * that would drift from it. Everything BuildPage hardcoded is now a prop, and
 * BuildPage passes the values it always used.
 */

// Lucide has no Google mark.
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" aria-hidden="true">
    <path fill="#4285F4" d="M22.5 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.22-4.74 3.22-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.98.66-2.24 1.06-3.72 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
    <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.06L5.84 9.9C6.71 7.3 9.14 4.75 12 4.75z" />
  </svg>
);

const Spinner = () => (
  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
  </svg>
);

export interface AccountSignupDialogProps {
  open: boolean;
  onClose: () => void;
  /** Headline. The trailing fragment is gradient filled. */
  title: ReactNode;
  subtitle?: string;
  /** Small echo card above the buttons, for the thing the visitor was doing. */
  contextLabel?: string;
  contextValue?: string;
  /**
   * Where the visitor lands after auth. Also written to oauth_return_url, which
   * the auth callback reads to set the post-onboarding destination.
   */
  returnPath: string;
}

export function AccountSignupDialog({
  open, onClose, title, subtitle, contextLabel, contextValue, returnPath,
}: AccountSignupDialogProps) {
  const [loading, setLoading] = useState<'google' | 'github' | null>(null);

  const handleGoogle = async () => {
    localStorage.setItem('oauth_return_url', returnPath);
    setLoading('google');
    await startSocialOAuth({ provider: 'google', intent: 'signup' });
    setLoading(null);
  };

  const handleGitHub = async () => {
    localStorage.setItem('oauth_return_url', returnPath);
    setLoading('github');
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(null);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[420px] gap-0 rounded-2.5xl p-0 [&>button]:hidden">
        <div className="relative rounded-2.5xl border border-border bg-card p-7 shadow-[0_50px_110px_-30px_rgba(0,0,0,0.5)] ring-1 ring-inset ring-white/5">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center text-center">
            <img src={ctLogoMark} alt="Creatives Takeover" className="mb-4 h-14 w-14 rounded-2xl object-cover shadow-lg" />

            <DialogTitle className="font-space-grotesk text-2xl font-bold tracking-tight">{title}</DialogTitle>
            {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}

            {contextValue && (
              <div className="mt-4 flex w-full items-start gap-3 rounded-xl border bg-muted/40 px-3.5 py-3 text-left">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-mono text-caption uppercase tracking-[0.16em] text-muted-foreground">{contextLabel}</p>
                  <p className="mt-0.5 text-xs font-semibold text-foreground">{contextValue}</p>
                </div>
              </div>
            )}

            <div className="mt-5 flex w-full flex-col gap-3">
              <Button asChild size="lg" className="h-12 w-full gap-2.5 text-sm font-bold">
                <Link to={`/signup?return=${encodeURIComponent(returnPath)}`}>
                  <Mail className="h-[17px] w-[17px]" aria-hidden="true" />
                  Sign up with email
                </Link>
              </Button>

              <Button variant="outline" size="lg" className="h-12 w-full gap-2.5 text-sm font-semibold"
                onClick={handleGoogle} disabled={loading !== null}>
                {loading === 'google' ? <Spinner /> : <GoogleIcon />}
                Continue with Google
              </Button>

              <Button variant="outline" size="lg" className="h-12 w-full gap-2.5 text-sm font-semibold"
                onClick={handleGitHub} disabled={loading !== null}>
                {loading === 'github' ? <Spinner /> : <Github className="h-[17px] w-[17px]" aria-hidden="true" />}
                Continue with GitHub
              </Button>
            </div>

            <p className="mt-5 text-xs leading-relaxed text-muted-foreground/70">
              By continuing, you agree to the{' '}
              <Link to="/terms" className="underline underline-offset-2 hover:text-muted-foreground">Terms</Link>
              {' '}and{' '}
              <Link to="/privacy-policy" className="underline underline-offset-2 hover:text-muted-foreground">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AccountSignupDialog;
