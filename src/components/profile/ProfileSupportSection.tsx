import { Suspense, lazy, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Clock, ExternalLink, Gift, Heart, Link2, MessageSquare, Rocket, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import {
  daysSince,
  defaultProfileSupport,
  lastUpdateLabel,
  normalizeProfileSupport,
  type ProfileSupport,
  type SupportAsk,
} from '@/lib/supportLinks';
import { cn } from '@/lib/utils';
import { ProfileShareButton } from './ProfileShareButton';

const AccountSignupDialog = lazy(() => import('@/components/auth/AccountSignupDialog'));

interface Props {
  username: string;
  name: string;
  startupName: string | null;
  /** The founder's own demo or website link, used for "Try" when there is no launch page. */
  productUrl: string | null;
  currentFocus: string | null;
  isOwnProfile: boolean;
  /** The owner previewing as a visitor: show the visitor view, but act on nothing. */
  preview?: boolean;
  onEditProfile?: () => void;
}

const CHIP = 'inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none';

const MESSAGE_ASKS: Partial<Record<SupportAsk, { icon: LucideIcon; label: (introTarget: string | null) => string }>> = {
  feedback: { icon: MessageSquare, label: () => 'Give feedback' },
  testers: { icon: Users, label: () => 'Become a beta tester' },
  intros: { icon: Link2, label: (target) => (target ? `Intro to ${target}` : 'Make an introduction') },
};

/**
 * "Support my work" on every founder and builder profile. Creatives Takeover
 * sends supporters to the founder's own page on an allowlisted provider; the
 * provider collects the amount, supporter details and payment. Updates add
 * context but are not required before visitors can see the support link.
 */
export function ProfileSupportSection({ username, name, startupName, productUrl, currentFocus, isOwnProfile, preview = false, onEditProfile }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [signupIntent, setSignupIntent] = useState<string | null>(null);
  const [confirmReport, setConfirmReport] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [supportAmount, setSupportAmount] = useState('');
  const [supporterName, setSupporterName] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportExpanded, setSupportExpanded] = useState(false);

  const query = useQuery({
    queryKey: ['profile-support', username, user?.id ?? null],
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<{ support: ProfileSupport; fallback: boolean } | null> => {
      const { data, error } = await supabase.rpc('public_profile_support_v1' as never, { p_username: username } as never);
      // Until its migration runs the function does not exist: show the default asks.
      if (error) return { support: defaultProfileSupport(), fallback: true };
      const support = normalizeProfileSupport(data);
      return support ? { support, fallback: false } : null;
    },
  });

  if (!query.data) return null;
  const { support, fallback } = query.data;
  const firstName = name.split(' ')[0] || name;
  const tryHref = support.launchSlug ? `/p/${encodeURIComponent(support.launchSlug)}` : productUrl;
  const asks = support.asks.filter((ask) => ask !== 'try' || Boolean(tryHref));
  const hasLink = Boolean(support.supportUrl && support.supportProvider);
  const canShowProviderLink = hasLink && (support.linkStatus !== 'reported' || isOwnProfile);
  const days = daysSince(support.lastUpdateAt);

  const askForMessage = (ask: SupportAsk) => {
    if (isOwnProfile || preview) {
      toast.info('Visitors who pick this open a message to you.');
      return;
    }
    captureEvent('help_ask_clicked', { ask, signed_in: Boolean(user), is_owner: false });
    if (!user) {
      setSignupIntent(`message ${firstName}`);
      return;
    }
    navigate(`/messages/${encodeURIComponent(username)}`);
  };

  const report = async () => {
    if (preview) {
      setConfirmReport(false);
      toast.info('Visitors can report your link here if it looks wrong.');
      return;
    }
    if (!user) {
      setSignupIntent('report this link');
      return;
    }
    setReporting(true);
    const { error } = await supabase.rpc('report_profile_support_link_v1' as never, { p_username: username } as never);
    setReporting(false);
    setConfirmReport(false);
    if (error) {
      toast.error('We could not send your report. Please try again.');
      return;
    }
    captureEvent('support_link_reported', { provider: support.supportProvider });
    toast.success('Thanks. The Creatives Takeover team will review this link.');
  };

  const ownerLinkNote: Record<string, string> = {
    live: 'Your support link is visible to visitors.',
    stale: days === null
      ? 'Your support link is visible. Add a progress update to give visitors more context.'
      : `Your support link is visible. Your last update was ${days} days ago; a fresh update can help visitors follow your progress.`,
    no_project: 'Your support link is visible. Add your project details to give visitors more context.',
    reported: 'Hidden from visitors after several reports. The team will review it.',
  };

  return (
    <Card className="mb-6 w-full overflow-hidden p-0">
      <div className="hidden">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
          Support my work
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {!fallback && (support.lastUpdateAt || isOwnProfile) && (
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              days !== null && days <= 30 ? 'bg-muted text-muted-foreground' : 'bg-warning/10 text-warning',
            )}>
              <Clock className="h-3 w-3" aria-hidden="true" />
              {lastUpdateLabel(support.lastUpdateAt)}
            </span>
          )}
          {isOwnProfile && onEditProfile && !fallback && (
            <Button variant="outline" size="sm" onClick={onEditProfile}>Edit</Button>
          )}
        </div>
      </div>

      <div className="block">
        <div className="hidden">
          {currentFocus ? (
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Now working on</span>
              <p className="border-l-2 border-primary/40 pl-3 text-sm leading-relaxed text-foreground">{currentFocus}</p>
            </div>
          ) : isOwnProfile ? (
            <p className="text-sm text-muted-foreground/70 italic">Add what you are working on in Edit Founder ID.</p>
          ) : null}
          {support.note ? (
            <p className="max-w-prose border-l-2 border-border pl-3 text-sm leading-relaxed">{support.note}</p>
          ) : isOwnProfile && !fallback ? (
          <p className="text-sm text-muted-foreground">Tell visitors what kind of help would move your project forward.</p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {asks.map((ask) => {
              if (ask === 'share') {
                return (
                  <ProfileShareButton
                    key={ask}
                    variant="chip"
                    className={CHIP}
                    username={username}
                    name={name}
                    startupName={startupName}
                    isOwnProfile={isOwnProfile}
                    founderId
                  />
                );
              }
              if (ask === 'try' && tryHref) {
                return (
                  <a
                    key={ask}
                    href={tryHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={CHIP}
                    onClick={() => captureEvent('help_ask_clicked', { ask, signed_in: Boolean(user), is_owner: isOwnProfile })}
                  >
                    <Rocket className="h-4 w-4 text-primary" aria-hidden="true" />
                    {startupName ? `Try ${startupName}` : 'Try the product'}
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                  </a>
                );
              }
              const config = MESSAGE_ASKS[ask];
              if (!config) return null;
              const Icon = config.icon;
              return (
                <button key={ask} type="button" className={CHIP} onClick={() => askForMessage(ask)}>
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {config.label(support.introTarget)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-4 bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-xl font-semibold">
              <Gift className="h-5 w-5 text-primary" aria-hidden="true" />
              Support {startupName || firstName}
            </p>
            <Button
              type="button"
              variant={supportExpanded ? 'ghost' : 'default'}
              onClick={() => setSupportExpanded((expanded) => !expanded)}
              aria-expanded={supportExpanded}
            >
              {supportExpanded ? 'Hide form' : 'Support'}
              {supportExpanded ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
          </div>
          {supportExpanded && <>
          <div className="flex items-center gap-2 rounded-xl bg-muted p-3">
            <span className="text-lg font-semibold" aria-hidden="true">$</span>
            <input
              aria-label="Amount donated"
              inputMode="decimal"
              type="number"
              min="1"
              step="1"
              placeholder="Enter amount"
              value={supportAmount}
              onChange={(event) => setSupportAmount(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
            />
            {[10, 25, 50].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setSupportAmount((current) => String((Number(current) || 0) + amount))}
                className="rounded-lg border border-border bg-background px-2.5 py-2 text-sm font-medium hover:border-primary/50"
              >
                +{amount}
              </button>
            ))}
          </div>
          <input
            aria-label="Your name or social handle"
            type="text"
            maxLength={80}
            placeholder="Name or @yoursocial"
            value={supporterName}
            onChange={(event) => setSupporterName(event.target.value)}
            className="h-14 rounded-xl bg-muted px-4 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          <textarea
            aria-label="Message for the founder"
            maxLength={500}
            placeholder="Say something nice..."
            value={supportMessage}
            onChange={(event) => setSupportMessage(event.target.value)}
            className="min-h-32 resize-y rounded-xl bg-muted px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
          />
          {canShowProviderLink ? (
            <Button asChild disabled={!supportAmount || Number(supportAmount) <= 0} className="min-h-12 w-full rounded-full text-base font-semibold">
              <a
                href={support.supportUrl!}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                aria-disabled={!supportAmount || Number(supportAmount) <= 0}
                onClick={(event) => {
                  if (!supportAmount || Number(supportAmount) <= 0) {
                    event.preventDefault();
                    return;
                  }
                  if (!preview) captureEvent('support_link_clicked', { provider: support.supportProvider, is_owner: isOwnProfile, amount: Number(supportAmount) });
                }}
              >
                Support
                <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          ) : (
            <>
              <Button disabled className="min-h-12 w-full rounded-full text-base font-semibold">Support</Button>
              {isOwnProfile && onEditProfile && <Button size="sm" variant="outline" className="w-full" onClick={onEditProfile}>Add a funding link</Button>}
            </>
          )}
          <p className="text-center text-xs leading-relaxed text-muted-foreground">
            Payment is completed on the user’s external support links.
          </p>
          </>}
          {false && <>
            {canShowProviderLink ? (
              <>
                <div>
                  <p className="flex items-center gap-2 text-lg font-semibold">
                    <Gift className="h-4 w-4 text-primary" aria-hidden="true" />
                    Support {startupName || firstName}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {support.fundingType === 'one_time' ? 'One-time contributions' :
                      support.fundingType === 'recurring' ? 'Recurring support' :
                      support.fundingType === 'both' ? 'One-time or recurring support' :
                      `Choose an available support option on ${support.supportProvider}`}
                  </p>
                </div>
                {support.paysFor && (
                  <div className="rounded-lg border border-border/60 bg-background/70 p-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your support helps with</span>
                    <p className="mt-1 text-sm leading-relaxed">{support.paysFor}</p>
                  </div>
                )}
                <Button asChild className="min-h-12 w-full text-base font-semibold">
                  <a
                    href={support.supportUrl!}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    onClick={() => { if (!preview) captureEvent('support_link_clicked', { provider: support.supportProvider, is_owner: isOwnProfile }); }}
                  >
                    Support on {support.supportProvider}
                    <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  {support.supportProvider === 'Buy Me a Coffee'
                    ? 'Choose an amount, leave your name and a message, then enter your card details on Buy Me a Coffee.'
                    : `Choose a support option and complete payment on ${support.supportProvider}.`}{' '}
                  No Creatives Takeover account is needed.
                </p>
                {isOwnProfile ? (
                  <p className={cn('text-xs', support.linkStatus === 'live' ? 'text-success' : 'text-warning')}>
                    {ownerLinkNote[support.linkStatus] ?? ownerLinkNote.live}
                  </p>
                ) : confirmReport ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Report this link as misleading or unsafe?</span>
                    <Button size="sm" variant="outline" onClick={() => void report()} disabled={reporting}>Report</Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmReport(false)} disabled={reporting}>Cancel</Button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="w-fit text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
                    onClick={() => setConfirmReport(true)}
                  >
                    Report this link
                  </button>
                )}
              </>
            ) : isOwnProfile ? (
              <>
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <Gift className="h-4 w-4 text-primary" aria-hidden="true" />
                  Set up support
                </p>
                <p className="text-sm text-muted-foreground">
                  Add your Buy Me a Coffee, Patreon, Ko-fi or another supported payment page. Visitors choose an amount and pay on that provider’s secure checkout.
                </p>
                {onEditProfile && <Button size="sm" className="w-fit" onClick={onEditProfile}>Add a funding link</Button>}
              </>
            ) : support.linkStatus === 'reported' ? (
              <>
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <Gift className="h-4 w-4 text-primary" aria-hidden="true" />
                  Support link under review
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This payment page is temporarily hidden while the Creatives Takeover team reviews reports.
                </p>
              </>
            ) : (
              <>
                <p className="flex items-center gap-2 text-lg font-semibold">
                  <Gift className="h-4 w-4 text-primary" aria-hidden="true" />
                  Support {startupName || firstName}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This founder hasn’t added a support page yet. Once they link Buy Me a Coffee, Patreon or another provider, you’ll be able to choose a contribution and check out there without a Creatives Takeover account.
                </p>
              </>
            )}
          </>}
        </div>
      </div>

      {signupIntent && (
        <Suspense fallback={null}>
          <AccountSignupDialog
            open
            onClose={() => setSignupIntent(null)}
            title={`Sign up to ${signupIntent}`}
            subtitle="A free account lets you message founders, follow their progress and share yours."
            returnPath={`${location.pathname}${location.search}`}
          />
        </Suspense>
      )}
    </Card>
  );
}
