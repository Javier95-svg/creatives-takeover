import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface MonthlyQuotas {
  discovery_calls_used: number;
  vc_profiles_viewed: number;
  accelerator_profiles_viewed: number;
}

const EMPTY_QUOTAS: MonthlyQuotas = {
  discovery_calls_used: 0,
  vc_profiles_viewed: 0,
  accelerator_profiles_viewed: 0,
};

function currentMonthDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function useMonthlyQuotas() {
  const { user } = useAuth();
  const [quotas, setQuotas] = useState<MonthlyQuotas>(EMPTY_QUOTAS);
  const [loading, setLoading] = useState(true);

  const fetchQuotas = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('user_monthly_quotas')
      .select('discovery_calls_used, vc_profiles_viewed, accelerator_profiles_viewed')
      .eq('user_id', user.id)
      .eq('month', currentMonthDate())
      .maybeSingle();

    if (!error && data) {
      setQuotas({
        discovery_calls_used: data.discovery_calls_used ?? 0,
        vc_profiles_viewed: data.vc_profiles_viewed ?? 0,
        accelerator_profiles_viewed: data.accelerator_profiles_viewed ?? 0,
      });
    } else {
      setQuotas(EMPTY_QUOTAS);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchQuotas(); }, [fetchQuotas]);

  return { quotas, loading, refreshQuotas: fetchQuotas };
}
