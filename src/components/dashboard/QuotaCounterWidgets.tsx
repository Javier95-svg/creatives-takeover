import { Phone, Eye, Building2, Handshake, Infinity as InfinityIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useMonthlyQuotas } from '@/hooks/useMonthlyQuotas';
import { getMonthlyQuotaLimit, isUnlimitedQuotaLimit, normalizePlan } from '@/config/planPermissions';
import { useSubscription } from '@/hooks/useSubscription';

const QuotaBar = ({ used, max }: { used: number; max: number }) => {
  if (isUnlimitedQuotaLimit(max)) {
    return <div className="mt-2 h-1.5 w-full rounded-full bg-primary/20" />;
  }

  const pct = max > 0 ? Math.min((used / max) * 100, 100) : 0;
  const color = pct >= 100 ? 'bg-destructive' : pct >= 66 ? 'bg-yellow-500' : 'bg-primary';
  return (
    <div className="w-full h-1.5 rounded-full bg-muted mt-2">
      <div className={`h-1.5 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
};

export const QuotaCounterWidgets = () => {
  const { plan } = usePlanAccess('discovery_calls');
  const { quotas, loading, cycleStart } = useMonthlyQuotas();
  const { subscriptionData } = useSubscription();

  const currentPlan = normalizePlan(subscriptionData.subscription_tier || plan);

  const dcLimit = getMonthlyQuotaLimit('discovery_calls', currentPlan);
  const cofounderLimit = getMonthlyQuotaLimit('cofounder_posts', currentPlan);
  const vcLimit = getMonthlyQuotaLimit('vc_search_profile', currentPlan);
  const accLimit = getMonthlyQuotaLimit('accelerator_profile', currentPlan);

  const resetDate = subscriptionData.subscription_end
    ? new Date(subscriptionData.subscription_end)
    : cycleStart
      ? new Date(`${cycleStart}T00:00:00.000Z`)
      : null;

  if (resetDate && !subscriptionData.subscription_end) {
    resetDate.setUTCMonth(resetDate.getUTCMonth() + 1);
  }

  const resetLabel = resetDate
    ? `Resets ${resetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
    : 'Billing cycle usage';

  const counters = [
    {
      icon: Phone,
      label: 'Discovery Calls',
      used: quotas.discovery_calls_used,
      max: dcLimit,
      suffix: '10 credits each',
    },
    {
      icon: Handshake,
      label: 'Co-Founder Posts',
      used: quotas.cofounder_posts_used,
      max: cofounderLimit,
      suffix: isUnlimitedQuotaLimit(cofounderLimit) ? 'unlimited' : 'included',
    },
    {
      icon: Eye,
      label: 'VC Profiles',
      used: quotas.vc_profiles_viewed,
      max: vcLimit,
      suffix: isUnlimitedQuotaLimit(vcLimit) ? 'unlimited' : 'views',
    },
    {
      icon: Building2,
      label: 'Accelerator Profiles',
      used: quotas.accelerator_profiles_viewed,
      max: accLimit,
      suffix: isUnlimitedQuotaLimit(accLimit) ? 'unlimited' : 'views',
    },
  ].filter((counter) => {
    if (currentPlan === 'rookie') {
      return counter.label === 'Discovery Calls' || counter.label === 'Co-Founder Posts';
    }

    return true;
  });

  if (loading) return null;

  return (
    <div className={`grid grid-cols-1 gap-3 ${currentPlan === 'rookie' ? 'sm:grid-cols-2' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
      {counters.map(({ icon: Icon, label, used, max, suffix }) => (
        <Card key={label} className="bg-card/60 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
              </div>
              <span className="text-[11px] text-muted-foreground">{resetLabel}</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold">{used}</span>
              <span className="text-sm text-muted-foreground">/</span>
              {isUnlimitedQuotaLimit(max) ? (
                <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                  <InfinityIcon className="h-3.5 w-3.5" />
                  {suffix}
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">{max} {suffix}</span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {label === 'Discovery Calls'
                ? 'No monthly cap. Credits are charged when a booking is confirmed.'
                : isUnlimitedQuotaLimit(max)
                ? 'No monthly cap on this workflow for your plan.'
                : `${Math.max(max - used, 0)} remaining this billing cycle.`}
            </p>
            <QuotaBar used={used} max={max} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
