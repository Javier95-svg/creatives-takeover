import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAnalyticsConsent } from '@/hooks/useAnalyticsConsent';
import { getConsentDecision, onCookieSettingsRequest, setAnalyticsConsent } from '@/lib/consent';
import { captureEvent } from '@/lib/analytics';

/**
 * Cookie consent strip, also opened from Cookie settings (footer and account
 * settings) to change the choice at any time. Non-modal by design — a
 * focus-trapping dialog would make the site unusable until the visitor decides,
 * which is both hostile and, for a "Reject All" that must be as easy as
 * accepting, legally weaker. Both buttons carry the same weight for the same
 * reason.
 *
 * Deliberately not built on ui/bottom-sheet.tsx: that is a Radix Dialog which
 * traps focus and collapses to a centered modal on desktop.
 */
export function CookieConsentBanner() {
  const status = useAnalyticsConsent();
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Hold the first paint back so the strip never competes with LCP or lands on
  // top of the hero while the page is still settling.
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => onCookieSettingsRequest(() => setSettingsOpen(true)), []);

  if (!settingsOpen && (status !== 'unknown' || !ready)) return null;

  // A stored decision while the status reads unknown means it was made under an
  // older policy or more than 12 months ago, so we are asking again.
  const previous = getConsentDecision();
  const askingAgain = status === 'unknown' && previous !== null;

  const accept = () => {
    setSettingsOpen(false);
    if (status === 'granted') return;
    setAnalyticsConsent('granted');
    // Only the accept path is measurable: a *_rejected or *_shown event would be
    // dropped by the gate this very click installs, producing a metric that is
    // permanently zero and quietly misleading.
    captureEvent('cookie_consent_accepted', { surface: settingsOpen ? 'cookie_settings' : 'global_banner' });
  };

  const reject = () => {
    setSettingsOpen(false);
    if (status === 'denied') return;
    setAnalyticsConsent('denied');
  };

  return (
    <div
      role="region"
      aria-label="Cookie consent"
      data-testid="cookie-consent"
      className="fixed inset-x-0 bottom-0 z-[70] border-t border-border bg-background/95 px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] backdrop-blur-md shadow-[0_-12px_32px_-24px_rgba(15,23,42,0.45)] animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:pr-8">
        <div className="space-y-1 pr-8 text-sm leading-relaxed text-muted-foreground sm:pr-0">
          {askingAgain && <p className="font-medium text-foreground">We have updated how we use analytics, so we are asking again.</p>}
          {settingsOpen && status !== 'unknown' && (
            <p className="font-medium text-foreground">
              Your current choice: {status === 'granted' ? 'analytics allowed' : 'analytics rejected'}.
            </p>
          )}
          <p>
            We count visits anonymously, without cookies. With your permission, we also use analytics
            cookies to understand how you use the platform over time, including how long you spend in
            each section, so we can improve what founders actually use. You can change this any time in
            Cookie settings.{' '}
            <Link
              to="/privacy-policy"
              className="font-medium text-foreground underline underline-offset-2 hover:text-primary"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:shrink-0 sm:items-center">
          <Button
            variant="outline"
            onClick={reject}
            className="min-h-11 w-full rounded-full sm:w-auto"
          >
            Reject All
          </Button>
          <Button
            variant="outline"
            onClick={accept}
            className="min-h-11 w-full rounded-full sm:w-auto"
          >
            Accept All
          </Button>
        </div>
      </div>
      {settingsOpen && status !== 'unknown' && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSettingsOpen(false)}
          aria-label="Close cookie settings"
          className="absolute right-2 top-2 h-8 w-8"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

export default CookieConsentBanner;
