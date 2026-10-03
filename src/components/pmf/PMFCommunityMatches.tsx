import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, HeartHandshake, Loader2, MessageSquareText, UserPlus, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/hooks/useMessaging';
import { captureEvent } from '@/lib/analytics';
import {
  fetchValidationMatches,
  fetchValidationOptIn,
  setValidationOptIn,
  type ValidationMatch,
} from '@/lib/pmfValidationMatches';
import { upsertPlatformLead } from '@/lib/pmfDiscoveryLeads';

interface PMFCommunityMatchesProps {
  industry: string;
  audience: string;
  problem: string;
  /** Bumped by the parent after each discovery run to refresh matches with the latest inputs. */
  refreshKey: number;
}

const ACTIVITY_LABEL: Record<ValidationMatch['activity_bucket'], string> = {
  this_week: 'Active this week',
  this_month: 'Active this month',
  earlier: '',
};

export default function PMFCommunityMatches({ industry, audience, problem, refreshKey }: PMFCommunityMatchesProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startConversation } = useMessaging({ autoLoad: false });
  const [matches, setMatches] = useState<ValidationMatch[]>([]);
  const [available, setAvailable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [optedIn, setOptedIn] = useState<boolean | null>(null);
  const [joining, setJoining] = useState(false);
  const [savedIds, setSavedIds] = useState<Record<string, boolean>>({});
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void fetchValidationOptIn(user.id).then((value) => {
      if (!cancelled) setOptedIn(value);
      if (value === null && !cancelled) setAvailable(false);
    });
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user || !available) return;
    let cancelled = false;
    setLoading(true);
    void fetchValidationMatches({ industry, audience, problem, limit: 8 })
      .then((result) => {
        if (cancelled) return;
        if (result === null) { setAvailable(false); return; }
        setMatches(result);
        if (result.length) captureEvent('pmf_discovery_platform_matches_viewed', { match_count: result.length });
      })
      .catch((error) => {
        console.warn('Failed to load validation matches:', error);
        if (!cancelled) setMatches([]);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // Refetch only when the parent signals fresh inputs, not on every keystroke.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, available, refreshKey]);

  const joinNetwork = useCallback(async () => {
    if (!user) return;
    setJoining(true);
    try {
      await setValidationOptIn(user.id, true);
      setOptedIn(true);
      captureEvent('pmf_validation_network_opt_in', { source: 'pmf_discovery' });
      toast.success('You joined the validation network. Founders in your space can now find you.');
    } catch (error) {
      console.warn('Failed to join validation network:', error);
      toast.error('Could not update your preference. Please try again.');
    } finally {
      setJoining(false);
    }
  }, [user]);

  const saveAsLead = useCallback(async (match: ValidationMatch) => {
    if (!user) return;
    setPendingId(match.user_id);
    try {
      await upsertPlatformLead(user.id, {
        platformUserId: match.user_id,
        username: match.username,
        displayName: match.full_name,
        painQuote: match.positioning_line || match.startup_tagline,
        rankScore: match.match_score,
      });
      setSavedIds((current) => ({ ...current, [match.user_id]: true }));
      toast.success('Saved to your discovery pipeline.');
    } catch (error) {
      console.warn('Failed to save platform lead:', error);
      toast.error('Could not save this lead.');
    } finally {
      setPendingId(null);
    }
  }, [user]);

  const messageMatch = useCallback(async (match: ValidationMatch) => {
    if (!user) return;
    setPendingId(match.user_id);
    try {
      // Keep the pipeline in sync before jumping to the inbox.
      await upsertPlatformLead(user.id, {
        platformUserId: match.user_id,
        username: match.username,
        displayName: match.full_name,
        painQuote: match.positioning_line || match.startup_tagline,
        rankScore: match.match_score,
      }).then((lead) => setSavedIds((current) => ({ ...current, [match.user_id]: Boolean(lead) })))
        .catch(() => undefined);
      const conversationId = await startConversation(match.user_id);
      if (conversationId) {
        captureEvent('pmf_discovery_platform_match_messaged', { match_score: match.match_score });
        navigate(`/messages?conversationId=${conversationId}`);
      }
    } finally {
      setPendingId(null);
    }
  }, [navigate, startConversation, user]);

  if (!user || !available) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold">Founders on the platform</h3>
      </div>
      <p className="text-caption text-muted-foreground">
        Members of the validation network building in your space. Interviews here convert far better than cold
        outreach — you can message them directly.
      </p>

      {optedIn === false && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <HeartHandshake className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed text-muted-foreground">
              Join the validation network to appear in other founders' matches — and help each other get real
              interviews. You can leave anytime from Account settings.
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={() => void joinNetwork()} disabled={joining}>
            {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
            Join the network
          </Button>
        </div>
      )}

      {loading && <Loader2 className="mx-auto h-5 w-5 animate-spin text-primary" />}
      {!loading && matches.length === 0 && (
        <p className="text-xs text-muted-foreground">
          No community matches yet — the network grows as more founders opt in. Reddit and other sources below still
          give you people to talk to today.
        </p>
      )}

      <div className="grid gap-2.5 md:grid-cols-2">
        {matches.map((match) => (
          <div key={match.user_id} className="rounded-2xl border border-border/60 bg-background/70 p-4 space-y-2">
            <div className="flex items-center gap-2.5">
              <Avatar className="h-9 w-9">
                <AvatarImage src={match.avatar_url || undefined} alt="" />
                <AvatarFallback>{(match.full_name || match.username).slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{match.full_name || match.username}</p>
                <p className="text-caption text-muted-foreground truncate">
                  {match.startup_name || `@${match.username}`}
                  {ACTIVITY_LABEL[match.activity_bucket] ? ` · ${ACTIVITY_LABEL[match.activity_bucket]}` : ''}
                </p>
              </div>
              <Badge variant="outline" className="ml-auto shrink-0 text-caption">Match {match.match_score}</Badge>
            </div>
            {(match.positioning_line || match.startup_tagline) && (
              <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
                {match.positioning_line || match.startup_tagline}
              </p>
            )}
            {match.match_reasons.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {match.match_reasons.map((reason) => (
                  <Badge key={reason} variant="outline" className="text-caption border-primary/20 bg-primary/5 text-primary">
                    {reason}
                  </Badge>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                disabled={pendingId === match.user_id}
                onClick={() => void messageMatch(match)}>
                <MessageSquareText className="mr-1 h-3 w-3" /> Message
              </Button>
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                disabled={pendingId === match.user_id || savedIds[match.user_id]}
                onClick={() => void saveAsLead(match)}>
                {savedIds[match.user_id] ? <Check className="mr-1 h-3 w-3 text-success" /> : <UserPlus className="mr-1 h-3 w-3" />}
                {savedIds[match.user_id] ? 'In pipeline' : 'Save as lead'}
              </Button>
              <a href={`/profile/${encodeURIComponent(match.username)}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex h-7 items-center px-2 text-xs text-primary hover:underline">
                View profile
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
