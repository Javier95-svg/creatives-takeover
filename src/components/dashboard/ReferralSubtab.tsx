import { useEffect, useMemo, useState } from 'react';
import { Check, Copy, Gift, Share2, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { buildReferralLink } from '@/lib/referral';

type ReferralRow = Database['public']['Tables']['referrals']['Row'];
type ReferralReward = Database['public']['Tables']['referral_rewards']['Row'];

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
        supabase.from('referral_codes').select('code').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('referrals')
          .select('id, referred_email, status, created_at')
          .eq('referrer_user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
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

      let resolvedCode = codeRes.data?.code ?? null;
      if (!resolvedCode && !codeRes.error) {
        const { data: generatedCode, error: generateError } = await supabase.rpc('generate_referral_code', {
          p_user_id: user.id,
        });
        if (generateError) {
          console.error('Failed to generate referral code', generateError);
        } else {
          resolvedCode = generatedCode;
        }
      }

      setCode(resolvedCode);
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
      <Card className="border-cyan-400/20 bg-cyan-400/[0.07] text-slate-100 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-cyan-200">
            <Gift className="h-4 w-4" />
            Your referral link
          </div>
          <CardTitle className="text-xl sm:text-2xl">
            Share this link. Every 3 new accounts unlock a reward.
          </CardTitle>
          <CardDescription>
            Rewards apply automatically — you don’t need to claim them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-mono text-sm break-all text-slate-200">
              {referralLink || 'Generating your link…'}
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCopy} disabled={!referralLink} className="rounded-full bg-cyan-300 text-slate-950 hover:bg-cyan-200">
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
              <Button
                onClick={handleShare}
                disabled={!referralLink}
                variant="outline"
                className="rounded-full border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.08] hover:text-white"
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
        <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardDescription>New accounts through your link</CardDescription>
            <CardTitle className="text-3xl">{verifiedCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
          <CardHeader className="pb-2">
            <CardDescription>Rewards unlocked</CardDescription>
            <CardTitle className="text-3xl">{rewardsUnlocked}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
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
      <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="text-lg">Attributed accounts</CardTitle>
          <CardDescription>
            People who created an account through your link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No referrals yet. Share your link to get started.
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
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
                    {r.status === 'verified' ? 'Attributed' : 'Pending'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Rewards history */}
      <Card className="border-white/10 bg-white/[0.045] text-slate-100 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-4 w-4 text-cyan-300" />
            Rewards earned
          </CardTitle>
          <CardDescription>
            Every reward is logged here the moment it’s granted.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No rewards yet. Your first reward unlocks at 3 new accounts.
            </p>
          ) : (
            <ul className="divide-y divide-white/10">
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
