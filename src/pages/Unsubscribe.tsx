import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? '') as string;

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const userId = searchParams.get('user_id');
    const token = searchParams.get('token');

    if (!userId || !token || !SUPABASE_URL) {
      setStatus('error');
      return;
    }

    const url = `${SUPABASE_URL}/functions/v1/email-sequences?unsubscribe=1&user_id=${encodeURIComponent(userId)}&token=${encodeURIComponent(token)}`;

    fetch(url)
      .then((res) => {
        setStatus(res.ok ? 'success' : 'error');
      })
      .catch(() => setStatus('error'));
  }, [searchParams]);

  return (
    <>
      <Helmet>
        <title>Unsubscribe — Creatives Takeover</title>
      </Helmet>
      <div className="flex min-h-screen items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full text-center space-y-4">
          {status === 'loading' && (
            <p className="text-muted-foreground text-sm">Processing your request…</p>
          )}

          {status === 'success' && (
            <>
              <h1 className="text-xl font-semibold text-foreground">You've been unsubscribed</h1>
              <p className="text-muted-foreground text-sm">
                You won't receive any more lifecycle emails from Creatives Takeover.
                Your account remains active and you can return any time.
              </p>
              <Link
                to="/"
                className="inline-block mt-2 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
              >
                Back to home
              </Link>
            </>
          )}

          {status === 'error' && (
            <>
              <h1 className="text-xl font-semibold text-foreground">Invalid unsubscribe link</h1>
              <p className="text-muted-foreground text-sm">
                This link has expired or is no longer valid. If you'd like to stop emails,
                reply to any email from us and we'll remove you manually.
              </p>
              <Link
                to="/"
                className="inline-block mt-2 text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
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
