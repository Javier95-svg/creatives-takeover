import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FlaskConical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

/**
 * PMF Lab sends a founder here with ?decision=narrow|pivot when the evidence
 * says the customer or problem should change. Until 2026-11-22 nothing read
 * that link, so the finding was lost on arrival. This shows what the evidence
 * found, from the stored PMF result, next to the draft it is about.
 */

export type IcpRevisionDecision = 'narrow' | 'pivot';

export function readIcpRevisionDecision(value: string | null): IcpRevisionDecision | null {
  return value === 'narrow' || value === 'pivot' ? value : null;
}

const TITLE: Record<IcpRevisionDecision, string> = {
  narrow: 'PMF Lab: narrow this customer',
  pivot: 'PMF Lab: test a different customer or problem',
};

const MEANING: Record<IcpRevisionDecision, string> = {
  narrow: 'Your conversations found demand, but from a narrower group or problem than this draft describes.',
  pivot: 'Your conversations point to a different problem or customer than this draft describes.',
};

interface PmfFinding {
  score: number | null;
  summary: string | null;
  nextExperiment: string | null;
  heldBack: string[];
}

const texts = (value: unknown, count: number) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, count)
    : [];

const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);

async function loadFinding(userId: string, validationContextId: string | null, icpAnalysisId: string | null): Promise<PmfFinding | null> {
  if (!validationContextId && !icpAnalysisId) return null;
  let query = supabase
    .from('pmf_analysis_results' as never)
    .select('pmf_score, analysis_data')
    .eq('user_id', userId);
  query = validationContextId
    ? query.eq('validation_context_id', validationContextId)
    : query.eq('icp_analysis_id', icpAnalysisId!);
  const { data, error } = await query.order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (error || !data) return null;
  const row = data as { pmf_score: number | null; analysis_data: Record<string, unknown> | null };
  const analysis = row.analysis_data ?? {};
  const heldBack = texts(analysis.commonObjections, 3);
  return {
    score: row.pmf_score === null ? null : Math.round(Number(row.pmf_score)),
    summary: text(analysis.summaryInsight),
    nextExperiment: text(analysis.nextExperiment),
    heldBack: heldBack.length ? heldBack : texts(analysis.gaps, 3),
  };
}

export function PmfDecisionBanner({
  userId,
  decision,
  validationContextId,
  icpAnalysisId,
  reviseHref,
  className,
}: {
  userId: string;
  decision: IcpRevisionDecision;
  validationContextId: string | null;
  icpAnalysisId: string | null;
  /** Where "Revise" goes; omitted when the founder is already editing. */
  reviseHref?: string;
  className?: string;
}) {
  const [finding, setFinding] = useState<PmfFinding | null>(null);

  useEffect(() => {
    let active = true;
    void loadFinding(userId, validationContextId, icpAnalysisId)
      .then((result) => { if (active) setFinding(result); })
      .catch(() => { if (active) setFinding(null); });
    return () => { active = false; };
  }, [userId, validationContextId, icpAnalysisId]);

  const pmfHref = validationContextId ? `/pmf-lab?context=${encodeURIComponent(validationContextId)}` : '/pmf-lab';

  // A fixed light card: the ICP draft page is always light, and theme text
  // colours turn white in dark mode.
  return (
    <section
      aria-label="What PMF Lab found"
      className={`rounded-3xl border border-amber-300 bg-amber-50 p-5 text-slate-900 sm:p-6 ${className ?? ''}`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <FlaskConical className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold sm:text-xl">{TITLE[decision]}</h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-700">
              {MEANING[decision]}
              {finding?.score !== null && finding?.score !== undefined ? ` Evidence score ${finding.score}/100.` : ''}
            </p>
            {finding?.summary ? <p className="max-w-2xl text-sm leading-6">{finding.summary}</p> : null}
            {finding?.heldBack.length ? (
              <div>
                <p className="text-sm font-semibold">What held it back</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-700">
                  {finding.heldBack.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ) : null}
            {finding?.nextExperiment ? (
              <p className="max-w-2xl text-sm leading-6"><span className="font-semibold">Next test: </span>{finding.nextExperiment}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          {reviseHref ? (
            <Button asChild>
              <Link to={reviseHref}>Revise this draft <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" /></Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="border-slate-300 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900">
            <Link to={pmfHref}>Back to PMF Lab</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

export default PmfDecisionBanner;
