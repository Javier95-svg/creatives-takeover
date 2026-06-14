import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MonthlyQuotas {
  discovery_calls_used: number;
  cofounder_posts_used: number;
  vc_profiles_viewed: number;
  accelerator_profiles_viewed: number;
}

const EMPTY_QUOTAS: MonthlyQuotas = {
  discovery_calls_used: 0,
  cofounder_posts_used: 0,
  vc_profiles_viewed: 0,
  accelerator_profiles_viewed: 0,
};

function toDateKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

export function getCurrentUtcMonthStart(): string {
  const now = new Date();
  return toDateKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
}

export function useMonthlyQuotas() {
  const { user } = useAuth();
  const [quotas, setQuotas] = useState<MonthlyQuotas>(EMPTY_QUOTAS);
  const [loading, setLoading] = useState(true);
  const [cycleStart, setCycleStart] = useState<string | null>(null);

  const fetchQuotas = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: billingPeriodStart } = await supabase.rpc('get_current_billing_period_start', {
        p_user_id: user.id,
      });
      const periodStart = billingPeriodStart || getCurrentUtcMonthStart();
      setCycleStart(periodStart);

      const [{ data: quotaRow }, { count: cofounderCount }, { data: vcCount }, { data: acceleratorCount }] = await Promise.all([
        supabase
          .from('user_monthly_quotas')
          .select('discovery_calls_used')
          .eq('user_id', user.id)
          .eq('month', periodStart)
          .maybeSingle(),
        supabase
          .from('cofounder_posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', periodStart),
        supabase.rpc('get_monthly_vc_view_count', { p_user_id: user.id }),
        supabase.rpc('get_monthly_accelerator_view_count', { p_user_id: user.id }),
      ]);

      setQuotas({
        discovery_calls_used: quotaRow?.discovery_calls_used ?? 0,
        cofounder_posts_used: cofounderCount ?? 0,
        vc_profiles_viewed: vcCount ?? 0,
        accelerator_profiles_viewed: acceleratorCount ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { void fetchQuotas(); }, [fetchQuotas]);

  return { quotas, loading, refreshQuotas: fetchQuotas, cycleStart };
}
