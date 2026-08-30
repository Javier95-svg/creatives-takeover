import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAnalyticsConsent } from '@/hooks/useAnalyticsConsent';
import { setAnalyticsConsent } from '@/lib/consent';
import { captureEvent } from '@/lib/analytics';

/**
 * Cookie consent strip. Non-modal by design — a focus-trapping dialog would make
 * the site unusable until the visitor decides, which is both hostile and, for a
 * "Reject All" that must be as easy as accepting, legally weaker.
 *
 * Deliberately not built on ui/bottom-sheet.tsx: that is a Radix Dialog which
 * traps focus and collapses to a centered modal on desktop.
 */
export function CookieConsentBanner() {
  const status = useAnalyticsConsent();
  const [ready, setReady] = useState(false);

  // Hold the first paint back so the strip never competes with LCP or lands on
  // top of the hero while the page is still settling.
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  if (status !== 'unknown' || !ready) return null;

  const accept = () => {
    setAnalyticsConsent('granted');
    // Only the accept path is measurable: a *_rejected or *_shown event would be
    // dropped by the gate this very click installs, producing a metric that is
    // permanently zero and quietly misleading.
    captureEvent('cookie_consent_accepted', { surface: 'global_banner' });
  };

  const reject = () => {
    setAnalyticsConsent('denied');
  };

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      data-testid="cookie-consent"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-border bg-background/95 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md shadow-[0_-12px_32px_-24px_rgba(15,23,42,0.45)] animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-muted-foreground">
          We use cookies on our website to see how you interact with it. By accepting, you agree to
          our use of such cookies.{' '}
          <Link
            to="/privacy-policy"
            className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
          >
            Privacy Policy
          </Link>
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0">
          <Button
            variant="outline"
            onClick={reject}
            className="min-h-11 w-full rounded-full sm:w-auto"
          >
            Reject All
          </Button>
          <Button onClick={accept} className="min-h-11 w-full rounded-full sm:w-auto">
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
}

export default CookieConsentBanner;
