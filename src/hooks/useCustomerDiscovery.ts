import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditActions } from '@/hooks/useCreditActions';
import { toast } from 'sonner';
import { trackActivity } from '@/lib/activity';
import { captureEvent } from '@/lib/analytics';

// ─── Types ──────────────────────────────────────────────────────────────────
export type PMFThreadCategory =
  | 'pain_point' | 'solution_request' | 'money_talk' | 'seeking_alternatives' | 'hot_discussion';

export interface PMFCommunity {
  name: string;
  platform?: string;
  source?: 'reddit' | 'web';
  subscribers?: number;
  url?: string;
  whyRelevant?: string;
  howToEngage?: string;
}

export interface PMFThread {
  id?: string;
  title: string;
  url?: string;
  source?: string;
  subreddit?: string;
  snippet?: string;
  painQuote?: string;
  outreachAngle?: string;
  category?: PMFThreadCategory;
  upvotes?: number;
  comments?: number;
  ageDays?: number;
  author?: string;
}

export interface PMFPainPoint {
  label: string;
  summary: string;
  intensity: number; // 1-5
  threadCount: number;
  totalEngagement: number;
  exampleQuote: string;
  threadIds: string[];
}

export interface PMFPerson {
  username: string;
  subreddit?: string;
  permalink: string;
  painQuote: string;
  category?: PMFThreadCategory;
}

export interface PMFSourceMeta {
  redditAvailable?: boolean;
  redditThreads?: number;
  subreddits?: number;
  webCommunities?: number;
  peopleCount?: number;
}

export interface PMFDiscovery {
  id: string | null;
  productName: string;
  targetAudience: string;
  problem: string;
  communities: PMFCommunity[];
  threads: PMFThread[];
  painPoints: PMFPainPoint[];
  people: PMFPerson[];
  dmTemplate: string;
  sourceMeta: PMFSourceMeta;
}

export interface DiscoveryInput {
  product?: string;
  audience?: string;
  industry?: string;
  problem: string;
}

const PMF_DISCOVERY_TABLE = 'pmf_customer_discovery' as never;

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

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
        .select('id, product_name, target_audience, problem, communities, threads, pain_points, people, search_meta, source_meta')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.warn('Failed to load customer discovery:', error);
        return;
      }
      if (data) {
        const row = data as Record<string, unknown>;
        setDiscovery({
          id: (row.id as string) ?? null,
          productName: (row.product_name as string) ?? '',
          targetAudience: (row.target_audience as string) ?? '',
          problem: (row.problem as string) ?? '',
          communities: asArray<PMFCommunity>(row.communities),
          threads: asArray<PMFThread>(row.threads),
          painPoints: asArray<PMFPainPoint>(row.pain_points),
          people: asArray<PMFPerson>(row.people),
          dmTemplate: ((row.search_meta as { dmTemplate?: string })?.dmTemplate) ?? '',
          sourceMeta: (row.source_meta as PMFSourceMeta) ?? {},
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
      return false;
    }
    if (!input.problem?.trim() && !input.product?.trim() && !input.audience?.trim()) {
      toast.error('Describe your product, audience, or the problem you solve.');
      return false;
    }

    const credits = ensureCredits('PMF_DISCOVERY');
    if (credits === null) return false;

    captureEvent('pmf_customer_discovery_started', {
      has_product: Boolean(input.product?.trim()),
      has_audience: Boolean(input.audience?.trim()),
      has_problem: Boolean(input.problem?.trim()),
    });
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
        return false;
      }

      const communities = asArray<PMFCommunity>(data.communities);
      const threads = asArray<PMFThread>(data.threads);
      const painPoints = asArray<PMFPainPoint>(data.painPoints);
      const people = asArray<PMFPerson>(data.people);

      setDiscovery({
        id: data.id ?? null,
        productName: input.product ?? '',
        targetAudience: input.audience ?? '',
        problem: input.problem ?? '',
        communities,
        threads,
        painPoints,
        people,
        dmTemplate: typeof data.dmTemplate === 'string' ? data.dmTemplate : '',
        sourceMeta: (data.sourceMeta as PMFSourceMeta) ?? {},
      });

      showCreditReceipt(
        'PMF_DISCOVERY',
        typeof data?.creditsUsed === 'number' ? data.creditsUsed : credits,
        typeof data?.newBalance === 'number' ? data.newBalance : undefined,
        { featureName: 'PMF Customer Discovery' },
      );

      void trackActivity('pmf_discovery_generated', {
        communities: communities.length,
        threads: threads.length,
        people: people.length,
        redditAvailable: Boolean(data.sourceMeta?.redditAvailable),
      }, user.id);

      captureEvent('pmf_customer_discovery_completed', {
        communities: communities.length,
        threads: threads.length,
        pain_points: painPoints.length,
        people: people.length,
        reddit_available: Boolean(data.sourceMeta?.redditAvailable),
      });
      return true;
    } catch (err) {
      console.error('Discovery error:', err);
      toast.error('Something went wrong. Please try again.');
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [user, ensureCredits, handleCreditError, showCreditReceipt]);

  return { discovery, isGenerating, generateDiscovery, loadDiscovery };
}
