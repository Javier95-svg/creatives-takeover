import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditActions } from '@/hooks/useCreditActions';
import { toast } from 'sonner';
import { trackActivity } from '@/lib/activity';

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

export type PMFDiscoverySourceNetwork = 'reddit' | 'hackernews';

export interface PMFThread {
  id?: string;
  title: string;
  url?: string;
  source?: PMFDiscoverySourceNetwork | string;
  subreddit?: string;
  snippet?: string;
  painQuote?: string;
  outreachAngle?: string;
  category?: PMFThreadCategory;
  upvotes?: number;
  comments?: number;
  ageDays?: number;
  author?: string;
  relevanceScore?: number;
  intentScore?: number;
  freshnessScore?: number;
  rankScore?: number;
  matchedQueries?: string[];
  rankingReason?: string;
  isNew?: boolean;
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
  source?: PMFDiscoverySourceNetwork | string;
  profileUrl?: string;
  rankScore?: number;
  intentScore?: number;
  isNew?: boolean;
  leadId?: string;
  leadStatus?: PMFDiscoveryLeadStatus;
  occurrenceCount?: number;
  isRepeat?: boolean;
}

export interface PMFExternalMention {
  platform: 'x' | 'linkedin';
  title: string;
  url: string;
  snippet?: string;
  username?: string;
}

export type PMFDiscoveryLeadStatus = 'new' | 'saved' | 'contacted' | 'interview_scheduled' | 'interviewed' | 'dismissed';

export interface PMFSourceMeta {
  redditAvailable?: boolean;
  redditStatus?: 'missing_credentials' | 'authentication_failed' | 'rate_limited' | 'api_unavailable' | 'available';
  redditHttpStatus?: number;
  reason?: string;
  redditThreads?: number;
  hackernewsThreads?: number;
  externalMentions?: number;
  subreddits?: number;
  webCommunities?: number;
  peopleCount?: number;
  requestsAttempted?: number;
  requestsSucceeded?: number;
  requestsFailed?: number;
  retryCount?: number;
  partial?: boolean;
  durationMs?: number;
}

export type PMFValidationStage = 'problem_discovery' | 'solution_validation' | 'pricing';

export interface PMFDiscoveryQueryMeta {
  searchVersion: 1 | 2;
  validationStage?: PMFValidationStage;
  queryVariants: string[];
  requestsAttempted: number;
  requestsSucceeded: number;
  requestsFailed: number;
  retryCount: number;
  rawCandidates: number;
  returnedThreads: number;
  partial: boolean;
  durationMs: number;
}

export interface PMFDiscoveryError {
  message: string;
  errorCode: string;
  stage?: 'configuration' | 'source' | 'generation' | 'credits' | 'persistence';
  retryable: boolean;
  creditsUsed: number;
  refunded: boolean;
  sourceMeta?: PMFSourceMeta;
}

export interface PMFDiscovery {
  id: string | null;
  createdAt?: string;
  productName: string;
  targetAudience: string;
  problem: string;
  communities: PMFCommunity[];
  threads: PMFThread[];
  painPoints: PMFPainPoint[];
  people: PMFPerson[];
  externalMentions: PMFExternalMention[];
  dmTemplate: string;
  sourceMeta: PMFSourceMeta;
  queryMeta?: PMFDiscoveryQueryMeta;
}

export interface PMFDiscoveryRunSummary {
  id: string;
  createdAt: string;
  productName: string;
  targetAudience: string;
}

export interface DiscoveryInput {
  product?: string;
  audience?: string;
  industry?: string;
  problem: string;
  searchVersion?: 1 | 2;
  validationStage?: PMFValidationStage;
  filters?: {
    timeRange?: 'month' | 'year' | 'all';
    includeSubreddits?: string[];
    excludeSubreddits?: string[];
  };
}

const PMF_DISCOVERY_TABLE = 'pmf_customer_discovery' as never;

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

const readFunctionErrorPayload = async (error: unknown, data: unknown): Promise<Record<string, unknown>> => {
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  const response = (error as { context?: { clone?: () => Response } } | null)?.context;
  if (!response || typeof response.clone !== 'function') return {};
  try {
    return await response.clone().json() as Record<string, unknown>;
  } catch {
    return {};
  }
};

const DISCOVERY_ROW_COLUMNS = 'id, created_at, product_name, target_audience, problem, communities, threads, pain_points, people, search_meta, source_meta';

const mapDiscoveryRow = (row: Record<string, unknown>): PMFDiscovery => {
  const searchMeta = row.search_meta as {
    dmTemplate?: string;
    queryMeta?: PMFDiscoveryQueryMeta;
    externalMentions?: PMFExternalMention[];
  } | null;
  return {
    id: (row.id as string) ?? null,
    createdAt: (row.created_at as string) ?? undefined,
    productName: (row.product_name as string) ?? '',
    targetAudience: (row.target_audience as string) ?? '',
    problem: (row.problem as string) ?? '',
    communities: asArray<PMFCommunity>(row.communities),
    threads: asArray<PMFThread>(row.threads),
    painPoints: asArray<PMFPainPoint>(row.pain_points),
    people: asArray<PMFPerson>(row.people),
    externalMentions: asArray<PMFExternalMention>(searchMeta?.externalMentions),
    dmTemplate: searchMeta?.dmTemplate ?? '',
    sourceMeta: (row.source_meta as PMFSourceMeta) ?? {},
    queryMeta: searchMeta?.queryMeta,
  };
};

// ─── Hook ───────────────────────────────────────────────────────────────────
export function useCustomerDiscovery() {
  const { user } = useAuth();
  const { ensureCredits, handleCreditError, showCreditReceipt } = useCreditActions();
  const [discovery, setDiscovery] = useState<PMFDiscovery | null>(null);
  const [discoveryError, setDiscoveryError] = useState<PMFDiscoveryError | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [runs, setRuns] = useState<PMFDiscoveryRunSummary[]>([]);

  const listRuns = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from(PMF_DISCOVERY_TABLE)
        .select('id, created_at, product_name, target_audience')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error || !data) return;
      setRuns((data as Array<Record<string, unknown>>).map((row) => ({
        id: String(row.id),
        createdAt: String(row.created_at ?? ''),
        productName: (row.product_name as string) ?? '',
        targetAudience: (row.target_audience as string) ?? '',
      })));
    } catch (err) {
      console.warn('Failed to list discovery runs:', err);
    }
  }, [user]);

  const loadDiscovery = useCallback(async (runId?: string) => {
    if (!user) return;
    try {
      let query = supabase
        .from(PMF_DISCOVERY_TABLE)
        .select(DISCOVERY_ROW_COLUMNS)
        .eq('user_id', user.id);
      if (runId) query = query.eq('id', runId);
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        console.warn('Failed to load customer discovery:', error);
        return;
      }
      if (data) setDiscovery(mapDiscoveryRow(data as Record<string, unknown>));
    } catch (err) {
      console.warn('Failed to load customer discovery:', err);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void loadDiscovery();
    void listRuns();
  }, [user, loadDiscovery, listRuns]);

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

    setDiscoveryError(null);
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('pmf-customer-discovery', {
        body: {
          productName: input.product,
          targetAudience: input.audience,
          industry: input.industry,
          problem: input.problem,
          searchVersion: input.searchVersion,
          validationStage: input.validationStage,
          filters: input.filters,
        },
      });

      if (error || !data?.success) {
        const payload = await readFunctionErrorPayload(error, data);
        const wasCreditError = handleCreditError(error, payload, 'PMF_DISCOVERY');
        if (!wasCreditError) {
          const message = typeof payload.error === 'string'
            ? payload.error
            : 'Could not generate your discovery list. Please try again.';
          setDiscoveryError({
            message,
            errorCode: typeof payload.errorCode === 'string' ? payload.errorCode : 'DISCOVERY_FAILED',
            stage: payload.stage as PMFDiscoveryError['stage'],
            retryable: Boolean(payload.retryable),
            creditsUsed: typeof payload.creditsUsed === 'number' ? payload.creditsUsed : 0,
            refunded: Boolean(payload.refunded),
            sourceMeta: payload.sourceMeta as PMFSourceMeta | undefined,
          });
          toast.error(message);
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
        externalMentions: asArray<PMFExternalMention>(data.externalMentions),
        dmTemplate: typeof data.dmTemplate === 'string' ? data.dmTemplate : '',
        sourceMeta: (data.sourceMeta as PMFSourceMeta) ?? {},
        queryMeta: data.queryMeta as PMFDiscoveryQueryMeta | undefined,
      });
      void listRuns();

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
      return true;
    } catch (err) {
      console.error('Discovery error:', err);
      const message = 'Something went wrong while contacting customer discovery. Please try again.';
      setDiscoveryError({
        message,
        errorCode: 'DISCOVERY_REQUEST_FAILED',
        retryable: true,
        creditsUsed: 0,
        refunded: false,
      });
      toast.error(message);
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [user, ensureCredits, handleCreditError, showCreditReceipt, listRuns]);

  return { discovery, discoveryError, isGenerating, generateDiscovery, loadDiscovery, runs, listRuns };
}
