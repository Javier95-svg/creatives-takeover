import { Suspense, lazy, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Clock, ExternalLink, Gift, Heart, Link2, MessageSquare, Rocket, Users } from 'lucide-react';
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
  isOwnProfile: boolean;
  onEditProfile?: () => void;
}

const CHIP = 'inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-2 text-left text-sm font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none';

const MESSAGE_ASKS: Partial<Record<SupportAsk, { icon: LucideIcon; label: (introTarget: string | null) => string }>> = {
  feedback: { icon: MessageSquare, label: () => 'Give feedback' },
  testers: { icon: Users, label: () => 'Become a beta tester' },
  intros: { icon: Link2, label: (target) => (target ? `Intro to ${target}` : 'Make an introduction') },
};

/**
 * "How you can support me" on every founder and builder profile. Money never
 * passes through Creatives Takeover: the support link is the founder's own
 * page on an allowlisted provider, shown only while they keep posting updates.
 */
export function ProfileSupportSection({ username, name, startupName, productUrl, isOwnProfile, onEditProfile }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [signupIntent, setSignupIntent] = useState<string | null>(null);
  const [confirmReport, setConfirmReport] = useState(false);
  const [reporting, setReporting] = useState(false);

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
  const showSupportCard = (hasLink && (support.linkStatus === 'live' || isOwnProfile)) || (isOwnProfile && !fallback);
  const days = daysSince(support.lastUpdateAt);

  const askForMessage = (ask: SupportAsk) => {
    captureEvent('help_ask_clicked', { ask, signed_in: Boolean(user), is_owner: isOwnProfile });
    if (isOwnProfile) {
      toast.info('Visitors who pick this open a message to you.');
      return;
    }
    if (!user) {
      setSignupIntent(`message ${firstName}`);
      return;
    }
    navigate(`/messages/${encodeURIComponent(username)}`);
  };

  const report = async () => {
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
    live: 'Visitors see this while you keep posting. It hides 30 days after your last update.',
    stale: days === null
      ? 'Hidden from visitors until you post your first update.'
      : `Hidden from visitors: your last update was ${days} days ago. Post an update to show it again.`,
    no_project: 'Hidden from visitors until you have an active project.',
    reported: 'Hidden from visitors after several reports. The team will review it.',
  };

  return (
    <Card className="mb-6 flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Heart className="h-4 w-4 text-primary" aria-hidden="true" />
          How you can support me
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

      <div className={cn('grid gap-5', showSupportCard && 'md:grid-cols-5')}>
        <div className={cn('flex min-w-0 flex-col gap-4', showSupportCard && 'md:col-span-3')}>
          {support.note ? (
            <p className="max-w-prose border-l-2 border-border pl-3 text-sm leading-relaxed">{support.note}</p>
          ) : isOwnProfile && !fallback ? (
            <p className="text-sm text-muted-foreground">Add a short note in Edit Profile saying what help matters most right now.</p>
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

        {showSupportCard && (
          <div className="flex min-w-0 flex-col gap-3 rounded-lg border border-border/70 p-4 md:col-span-2">
            {hasLink ? (
              <>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Gift className="h-4 w-4 text-primary" aria-hidden="true" />
                  Support {firstName} directly
                </p>
                {support.paysFor && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">What support pays for</span>
                    <span className="text-sm leading-relaxed">{support.paysFor}</span>
                  </div>
                )}
                <Button asChild className="w-full">
                  <a
                    href={support.supportUrl!}
                    target="_blank"
                    rel="noopener noreferrer nofollow ugc"
                    onClick={() => captureEvent('support_link_clicked', { provider: support.supportProvider, is_owner: isOwnProfile })}
                  >
                    Support on {support.supportProvider}
                    <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                  </a>
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Payments are handled by {support.supportProvider}. Support is a gift: it doesn't buy equity, returns or rewards.
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
            ) : (
              <>
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Gift className="h-4 w-4 text-primary" aria-hidden="true" />
                  Add a support link
                </p>
                <p className="text-sm text-muted-foreground">
                  Link your Ko-fi, Buy Me a Coffee, Patreon or Stripe page. Visitors see it while you post at least one update a month.
                </p>
                {onEditProfile && <Button variant="outline" size="sm" className="w-fit" onClick={onEditProfile}>Add a link</Button>}
              </>
            )}
          </div>
        )}
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
