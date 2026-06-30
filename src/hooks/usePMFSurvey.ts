import { useState, useEffect, useCallback } from 'react';
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
}

const SURVEYS = 'pmf_surveys' as never;
const RESPONSES = 'pmf_survey_responses' as never;
const EVIDENCE = 'pmf_validation_evidence' as never;

const EMPTY_AGGREGATE: PMFSurveyAggregate = { total: 0, very: 0, somewhat: 0, not: 0, veryPct: 0, verbatims: [] };

const shortId = (n = 6) => Math.random().toString(36).slice(2, 2 + n);
const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'feedback';

function publicOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin;
  return 'https://creatives-takeover.com';
}

export function usePMFSurvey() {
  const { user } = useAuth();
  const [survey, setSurvey] = useState<PMFSurvey | null>(null);
  const [aggregate, setAggregate] = useState<PMFSurveyAggregate>(EMPTY_AGGREGATE);
  const [isCreating, setIsCreating] = useState(false);

  const loadResponses = useCallback(async (surveyId: string) => {
    const { data, error } = await supabase
      .from(RESPONSES)
      .select('sean_ellis_answer, main_benefit, would_use_instead, role, feedback, created_at')
      .eq('survey_id', surveyId)
      .order('created_at', { ascending: false })
      .limit(300);
    if (error || !data) {
      setAggregate(EMPTY_AGGREGATE);
      return;
    }
    let very = 0, somewhat = 0, not = 0;
    const verbatims: PMFSurveyVerbatim[] = [];
    for (const r of data as unknown as Array<Record<string, string | null>>) {
      if (r.sean_ellis_answer === 'very') very++;
      else if (r.sean_ellis_answer === 'somewhat') somewhat++;
      else if (r.sean_ellis_answer === 'not') not++;
      if ((r.main_benefit || r.feedback) && verbatims.length < 8) {
        verbatims.push({
          mainBenefit: r.main_benefit,
          wouldUseInstead: r.would_use_instead,
          feedback: r.feedback,
          role: r.role,
          seanEllis: r.sean_ellis_answer ?? '',
          createdAt: r.created_at ?? '',
        });
      }
    }
    const total = very + somewhat + not;
    setAggregate({ total, very, somewhat, not, veryPct: total > 0 ? Math.round((very / total) * 100) : 0, verbatims });
  }, []);

  const loadSurvey = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from(SURVEYS)
      .select('id, slug, product_name, audience, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error || !data) return;
    setSurvey(data as unknown as PMFSurvey);
    await loadResponses((data as unknown as PMFSurvey).id);
  }, [user, loadResponses]);

  useEffect(() => {
    if (!user) return;
    void loadSurvey();
  }, [user, loadSurvey]);

  const createAndPublishSurvey = useCallback(async (opts: { productName?: string; audience?: string }) => {
    if (!user) {
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
            .from(EVIDENCE)
            .upsert({
              user_id: user.id,
              required_signals: PMF_REQUIRED_SIGNALS,
            } as never, { onConflict: 'user_id' });
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
  }, [user]);

  const refreshResponses = useCallback(async () => {
    if (survey) await loadResponses(survey.id);
  }, [survey, loadResponses]);

  const shareUrl = survey ? `${publicOrigin()}/pmf-survey/${survey.slug}` : null;

  return { survey, aggregate, shareUrl, isCreating, createAndPublishSurvey, refreshResponses };
}
