import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PMF_REQUIRED_SIGNALS } from '@/lib/bizmapStages';
import { captureEvent } from '@/lib/analytics';

export interface PMFSurvey {
  id: string;
  slug: string;
  product_name: string | null;
  audience: string | null;
  status: string;
}

export interface PMFSurveyVerbatim {
  mainBenefit: string | null;
  wouldUseInstead: string | null;
  feedback: string | null;
  role: string | null;
  seanEllis: string;
  createdAt: string;
}

export interface PMFSurveyAggregate {
  total: number;
  very: number;
  somewhat: number;
  not: number;
  veryPct: number;
  verbatims: PMFSurveyVerbatim[];
  conceptFeedback?: PMFSurveyVerbatim[];
}

const SURVEYS = 'pmf_surveys' as never;
const RESPONSES = 'pmf_survey_responses' as never;

const EMPTY_AGGREGATE: PMFSurveyAggregate = { total: 0, very: 0, somewhat: 0, not: 0, veryPct: 0, verbatims: [] };

const shortId = (n = 6) => Math.random().toString(36).slice(2, 2 + n);
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'feedback';

function publicOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'https://creatives-takeover.com';
}

export function usePMFSurvey(validationContextId?: string | null, originatingHandoffId?: string | null) {
  const { user } = useAuth();
  const [survey, setSurvey] = useState<PMFSurvey | null>(null);
  const [aggregate, setAggregate] = useState<PMFSurveyAggregate>(EMPTY_AGGREGATE);
  const [isCreating, setIsCreating] = useState(false);
  const activeContextRef = useRef(validationContextId);
  activeContextRef.current = validationContextId;

  const loadResponses = useCallback(async (surveyId: string) => {
    const eligible = () => supabase.from(RESPONSES).select('*', { count: 'exact', head: true })
      .eq('survey_id', surveyId).eq('verified', true).eq('product_usage', 'used');
    const fields = 'sean_ellis_answer, main_benefit, would_use_instead, role, feedback, created_at, product_usage';
    const [veryResult, somewhatResult, notResult, usedResult, conceptResult] = await Promise.all([
      eligible().eq('sean_ellis_answer', 'very'),
      eligible().eq('sean_ellis_answer', 'somewhat'),
      eligible().eq('sean_ellis_answer', 'not'),
      supabase.from(RESPONSES).select(fields).eq('survey_id', surveyId).eq('verified', true)
        .eq('product_usage', 'used').order('created_at', { ascending: false }).limit(8),
      supabase.from(RESPONSES).select(fields).eq('survey_id', surveyId).eq('verified', true)
        .neq('product_usage', 'used').order('created_at', { ascending: false }).limit(8),
    ]);
    if (activeContextRef.current !== validationContextId) return;
    if ([veryResult, somewhatResult, notResult, usedResult, conceptResult].some(result => result.error)) {
      setAggregate(EMPTY_AGGREGATE);
      return;
    }
    const very = veryResult.count ?? 0, somewhat = somewhatResult.count ?? 0, not = notResult.count ?? 0;
    const toVerbatim = (r: Record<string, string | null>): PMFSurveyVerbatim => ({
      mainBenefit: r.main_benefit, wouldUseInstead: r.would_use_instead, feedback: r.feedback,
      role: r.role, seanEllis: r.product_usage === 'used' ? r.sean_ellis_answer ?? '' : 'ineligible',
      createdAt: r.created_at ?? '',
    });
    const verbatims = (usedResult.data ?? []).map(toVerbatim);
    const conceptFeedback = (conceptResult.data ?? []).map(toVerbatim);
    const total = very + somewhat + not;
    if (activeContextRef.current === validationContextId) {
      setAggregate({ total, very, somewhat, not, veryPct: total > 0 ? Math.round((very / total) * 100) : 0, verbatims, conceptFeedback });
    }
  }, [validationContextId]);

  const loadSurvey = useCallback(async () => {
    if (!user || !validationContextId) return;
    const { data, error } = await supabase
      .from(SURVEYS)
      .select('id, slug, product_name, audience, status')
      .eq('user_id', user.id)
      .eq('validation_context_id', validationContextId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return;
    if (activeContextRef.current !== validationContextId) return;
    setSurvey(data as unknown as PMFSurvey);
    await loadResponses((data as unknown as PMFSurvey).id);
  }, [user, validationContextId, loadResponses]);

  useEffect(() => {
    setSurvey(null);
    setAggregate(EMPTY_AGGREGATE);
    if (!user || !validationContextId) return;
    void loadSurvey();
  }, [user, loadSurvey]);

  const createAndPublishSurvey = useCallback(async (opts: { productName?: string; audience?: string }) => {
    if (!user || !validationContextId) {
      toast.error('Sign in to create a survey.');
      return null;
    }
    setIsCreating(true);
    try {
      const base = slugify(opts.productName || 'feedback');
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const slug = `${base}-${shortId(6)}`;
        const { data, error } = await supabase
          .from(SURVEYS)
          .insert({
            user_id: user.id,
            validation_context_id: validationContextId,
            originating_handoff_id: originatingHandoffId ?? null,
            slug,
            product_name: opts.productName || null,
            audience: opts.audience || null,
            status: 'published',
          } as never)
          .select('id, slug, product_name, audience, status')
          .single();
        if (!error && data) {
          setSurvey(data as unknown as PMFSurvey);
          setAggregate(EMPTY_AGGREGATE);
          await supabase
            .from('pmf_context_evidence' as never)
            .upsert({
              user_id: user.id,
              validation_context_id: validationContextId,
              originating_handoff_id: originatingHandoffId ?? null,
              required_signals: PMF_REQUIRED_SIGNALS,
            } as never, { onConflict: 'user_id,validation_context_id' });
          captureEvent('pmf_survey_created', {
            has_product_name: Boolean(opts.productName?.trim()),
            has_audience: Boolean(opts.audience?.trim()),
          });
          toast.success('Survey published — share the link to collect real feedback.');
          return data as unknown as PMFSurvey;
        }
        lastError = error;
        if (!/duplicate key|unique/i.test((error as { message?: string })?.message || '')) break;
      }
      console.error('Create survey failed:', lastError);
      toast.error('Could not create the survey. Please try again.');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [originatingHandoffId, user, validationContextId]);

  const refreshResponses = useCallback(async () => {
    if (survey) await loadResponses(survey.id);
  }, [survey, loadResponses]);

  const shareUrl = survey ? `${publicOrigin()}/pmf-survey/${survey.slug}` : null;

  return { survey, aggregate, shareUrl, isCreating, createAndPublishSurvey, refreshResponses };
}
