import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditActions } from '@/hooks/useCreditActions';
import { toast } from 'sonner';
import { trackActivity } from '@/lib/activity';

// ─── Types ──────────────────────────────────────────────────────────────────
export interface PMFCommunity {
  name: string;
  platform?: string;
  url?: string;
  whyRelevant?: string;
  howToEngage?: string;
}

export interface PMFThread {
  title: string;
  url?: string;
  source?: string;
  snippet?: string;
  painQuote?: string;
  outreachAngle?: string;
}

export interface PMFDiscovery {
  id: string | null;
  productName: string;
  targetAudience: string;
  problem: string;
  communities: PMFCommunity[];
  threads: PMFThread[];
}

export interface DiscoveryInput {
  product?: string;
  audience?: string;
  industry?: string;
  problem: string;
}

const PMF_DISCOVERY_TABLE = 'pmf_customer_discovery' as any;

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useCustomerDiscovery() {
  const { user } = useAuth();
  const { ensureCredits, handleCreditError, showCreditReceipt } = useCreditActions();
  const [discovery, setDiscovery] = useState<PMFDiscovery | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadDiscovery = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from(PMF_DISCOVERY_TABLE)
        .select('id, product_name, target_audience, problem, communities, threads')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.warn('Failed to load customer discovery:', error);
        return;
      }
      if (data) {
        const row = data as any;
        setDiscovery({
          id: row.id,
          productName: row.product_name ?? '',
          targetAudience: row.target_audience ?? '',
          problem: row.problem ?? '',
          communities: Array.isArray(row.communities) ? row.communities : [],
          threads: Array.isArray(row.threads) ? row.threads : [],
        });
      }
    } catch (err) {
      console.warn('Failed to load customer discovery:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadDiscovery();
  }, [user, loadDiscovery]);

  const generateDiscovery = useCallback(async (input: DiscoveryInput) => {
    if (!user) {
      toast.error('Sign in to find customers to talk to.');
      return;
    }
    if (!input.problem?.trim() && !input.product?.trim() && !input.audience?.trim()) {
      toast.error('Describe your product, audience, or the problem you solve.');
      return;
    }

    const credits = ensureCredits('PMF_DISCOVERY');
    if (credits === null) return;

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('pmf-customer-discovery', {
        body: {
          productName: input.product,
          targetAudience: input.audience,
          industry: input.industry,
          problem: input.problem,
        },
      });

      if (error || !data?.success) {
        const wasCreditError = handleCreditError(error, data, 'PMF_DISCOVERY');
        if (!wasCreditError) {
          toast.error('Could not generate your discovery list. Please try again.');
        }
        return;
      }

      setDiscovery({
        id: data.id ?? null,
        productName: input.product ?? '',
        targetAudience: input.audience ?? '',
        problem: input.problem ?? '',
        communities: Array.isArray(data.communities) ? data.communities : [],
        threads: Array.isArray(data.threads) ? data.threads : [],
      });

      showCreditReceipt(
        'PMF_DISCOVERY',
        typeof data?.creditsUsed === 'number' ? data.creditsUsed : credits,
        typeof data?.newBalance === 'number' ? data.newBalance : undefined,
        { featureName: 'PMF Customer Discovery' },
      );

      void trackActivity('pmf_discovery_generated', {
        communities: Array.isArray(data.communities) ? data.communities.length : 0,
        threads: Array.isArray(data.threads) ? data.threads.length : 0,
      }, user.id);
    } catch (err) {
      console.error('Discovery error:', err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  }, [user, ensureCredits, handleCreditError, showCreditReceipt]);

  return { discovery, isGenerating, generateDiscovery, loadDiscovery };
}
