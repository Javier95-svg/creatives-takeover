import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Gift, Share2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Referral tables were added in 20260418120000_create_referral_program.sql
// and are not yet in the generated Database types. Cast the client to access them.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { buildReferralLink } from '@/lib/referral';

interface ReferralRow {
  id: string;
  referred_email: string;
  status: 'pending' | 'verified';
  created_at: string;
}

interface ReferralReward {
  id: string;
  reward_type: 'tier_upgrade' | 'credits';
  from_tier: string | null;
  to_tier: string | null;
  credits_granted: number | null;
  created_at: string;
}

const BATCH_SIZE = 3;

const obfuscateEmail = (email: string) => {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${'*'.repeat(Math.max(1, local.length - 2))}@${domain}`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

const describeReward = (reward: ReferralReward): string => {
  if (reward.reward_type === 'tier_upgrade') {
    const from = reward.from_tier ? reward.from_tier.charAt(0).toUpperCase() + reward.from_tier.slice(1) : '';
    const to = reward.to_tier ? reward.to_tier.charAt(0).toUpperCase() + reward.to_tier.slice(1) : '';
    return `Plan upgrade: ${from} → ${to}`;
  }
  return `+${reward.credits_granted ?? 50} credits`;
};

export function ReferralSubtab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      const [codeRes, referralsRes, rewardsRes] = await Promise.all([
        db.from('referral_codes').select('code').eq('user_id', user.id).maybeSingle(),
        db
          .from('referrals')
          .select('id, referred_email, status, created_at')
          .eq('referrer_user_id', user.id)
          .order('created_at', { ascending: false }),
        db
          .from('referral_rewards')
          .select('id, reward_type, from_tier, to_tier, credits_granted, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (cancelled) return;

      if (codeRes.error) {
        console.error('Failed to load referral code', codeRes.error);
      }
      if (referralsRes.error) {
        console.error('Failed to load referrals', referralsRes.error);
      }
      if (rewardsRes.error) {
        console.error('Failed to load referral rewards', rewardsRes.error);
      }

      setCode((codeRes.data?.code as string | undefined) ?? null);
      setReferrals((referralsRes.data as ReferralRow[] | null) ?? []);
      setRewards((rewardsRes.data as ReferralReward[] | null) ?? []);
      setLoading(false);
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const referralLink = useMemo(() => (code ? buildReferralLink(code) : ''), [code]);

  const verifiedCount = useMemo(
    () => referrals.filter((r) => r.status === 'verified').length,
    [referrals]
  );
  const towardNext = verifiedCount % BATCH_SIZE;
  const progressPct = (towardNext / BATCH_SIZE) * 100;
  const rewardsUnlocked = Math.floor(verifiedCount / BATCH_SIZE);

  const handleCopy = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success('Referral link copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Unable to copy. Please copy manually.');
    }
  };

  const handleShare = async () => {
    if (!referralLink) return;
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'Creatives Takeover',
          text: 'Build your business with Creatives Takeover.',
          url: referralLink,
        });
        return;
      } catch {
        // User cancelled or share failed — fall through to copy
      }
    }
    await handleCopy();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Link hero */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
            <Gift className="h-4 w-4" />
            Your referral link
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            Share this link. Every 3 signups unlocks a reward.
          </CardTitle>
          <CardDescription>
            Rewards apply automatically — you don’t need to claim them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 rounded-lg border border-border/60 bg-background/80 px-4 py-3 font-mono text-sm break-all">
              {referralLink || 'Generating your link…'}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopy} disabled={!referralLink} className="rounded-full">
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                onClick={handleShare}
                disabled={!referralLink}
                variant="outline"
                className="rounded-full"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Verified referrals</CardDescription>
            <CardTitle className="text-3xl">{verifiedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Rewards unlocked</CardDescription>
            <CardTitle className="text-3xl">{rewardsUnlocked}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Progress to next reward</CardDescription>
            <CardTitle className="text-3xl">
              {towardNext} <span className="text-base font-normal text-muted-foreground">of {BATCH_SIZE}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={progressPct} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Referrals list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your referrals</CardTitle>
          <CardDescription>
            People who signed up through your link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No referrals yet. Share your link to get started.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {referrals.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-sm">{obfuscateEmail(r.referred_email)}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(r.created_at)}</div>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      r.status === 'verified'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {r.status === 'verified' ? 'Verified' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Rewards history */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-4 w-4 text-primary" />
            Rewards earned
          </CardTitle>
          <CardDescription>
            Every reward is logged here the moment it’s granted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rewards yet. Your first reward unlocks at 3 verified referrals.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {rewards.map((reward) => (
                <li key={reward.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium text-sm">{describeReward(reward)}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(reward.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
