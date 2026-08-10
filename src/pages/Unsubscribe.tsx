import { useMemo, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '') as string;

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'confirm' | 'loading' | 'success' | 'error'>('confirm');
  const userId = searchParams.get('user_id');
  const token = searchParams.get('token');
  const canUnsubscribe = Boolean(userId && token && SUPABASE_URL);
  const preferencesUrl = useMemo(
    () => `/login?return=${encodeURIComponent('/account#notification-preferences')}`,
    [],
  );

  const unsubscribe = async () => {
    if (!canUnsubscribe || !userId || !token) {
      setStatus('error');
      return;
    }

    setStatus('loading');
    const url = `${SUPABASE_URL}/functions/v1/email-sequences?unsubscribe=1&user_id=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;

    try {
      const response = await fetch(url);
      setStatus(response.ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  };

  return (
    <>
      <Helmet>
        <title>Unsubscribe — Creatives Takeover</title>
      </Helmet>
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md space-y-5 rounded-2xl border border-border bg-card p-7 text-center shadow-sm">
          {status === 'confirm' && (
            <>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Email preferences
              </p>
              <h1 className="text-2xl font-semibold text-foreground">Before you go</h1>
              <p className="text-sm leading-6 text-muted-foreground">
                You can reduce the emails you receive, or unsubscribe from all Creatives Takeover
                retention and lifecycle emails. Account and security messages will still arrive.
              </p>
              <div className="space-y-3 pt-1">
                <Link
                  to={preferencesUrl}
                  className="flex min-h-11 w-full items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  Manage email preferences
                </Link>
                <button
                  type="button"
                  onClick={() => void unsubscribe()}
                  disabled={!canUnsubscribe}
                  className="min-h-11 w-full rounded-lg px-4 text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Unsubscribe from retention emails
                </button>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                Unsubscribing does not close or change your account.
              </p>
            </>
          )}

          {status === 'loading' && (
            <p className="text-sm text-muted-foreground" role="status">
              Updating your email preferences…
            </p>
          )}

          {status === 'success' && (
            <>
              <h1 className="text-xl font-semibold text-foreground">You've been unsubscribed</h1>
              <p className="text-sm text-muted-foreground">
                You won't receive any more retention or lifecycle emails from Creatives Takeover.
                Your account remains active and you can return any time.
              </p>
              <Link
                to="/"
                className="mt-2 inline-block text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
              >
                Back to home
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-xl font-semibold text-foreground">Invalid unsubscribe link</h1>
              <p className="text-sm text-muted-foreground">
                This link has expired or is no longer valid. If you'd like to stop emails,
                reply to any email from us and we'll remove you manually.
              </p>
              <Link
                to="/"
                className="mt-2 inline-block text-sm text-muted-foreground underline underline-offset-2 transition-colors hover:text-foreground"
              >
                Back to home
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Unsubscribe;
