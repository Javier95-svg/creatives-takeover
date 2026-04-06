import { Phone, Eye, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { usePlanAccess } from '@/hooks/usePlanAccess';
import { useMonthlyQuotas } from '@/hooks/useMonthlyQuotas';
import { getMonthlyQuotaLimit } from '@/config/planPermissions';

const QuotaBar = ({ used, max }: { used: number; max: number }) => {
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
  const { quotas, loading } = useMonthlyQuotas();

  if (plan !== 'starter' && plan !== 'rising') return null;

  const dcLimit = getMonthlyQuotaLimit('discovery_calls', plan);
  const vcLimit = getMonthlyQuotaLimit('vc_search_profile', plan);
  const accLimit = getMonthlyQuotaLimit('accelerator_profile', plan);

  const counters = [
    {
      icon: Phone,
      label: 'Discovery Calls',
      used: quotas.discovery_calls_used,
      max: dcLimit,
      suffix: 'free/mo',
    },
    {
      icon: Eye,
      label: 'VC Profiles',
      used: quotas.vc_profiles_viewed,
      max: vcLimit,
      suffix: 'views/mo',
    },
    {
      icon: Building2,
      label: 'Accelerator Profiles',
      used: quotas.accelerator_profiles_viewed,
      max: accLimit,
      suffix: 'views/mo',
    },
  ];

  if (loading) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {counters.map(({ icon: Icon, label, used, max, suffix }) => (
        <Card key={label} className="bg-card/60 border-border/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold">{used}</span>
              <span className="text-sm text-muted-foreground">/ {max} {suffix}</span>
            </div>
            <QuotaBar used={used} max={max} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
