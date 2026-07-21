import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CircleDashed, ScanSearch, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

// ICP evidence ledger v1: shows how the founder's real downstream evidence
// (PMF interviews + score, live demo behavior, waitlist signups) confirms or
// contradicts this ICP — the start of the "evidence-updating ICP" instead of a
// static generated document. Read-only aggregation; no LLM call.

interface EvidenceState {
  pmf: { score: number | null; verdictLabel: string | null; interviews: number; contradictions: string[] } | null;
  demo: { uniqueViewers: number; completions: number; signups: number } | null;
  waitlistSignups: number;
  traction: { channel: string; signal: string; recommendation: string } | null;
}

interface IcpEvidenceCheckProps {
  userId: string;
}

type Tone = 'confirm' | 'contradict' | 'pending';

function toneIcon(tone: Tone) {
  if (tone === 'confirm') return <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />;
  if (tone === 'contradict') return <XCircle className="h-4 w-4 shrink-0 text-warning" />;
  return <CircleDashed className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

export default function IcpEvidenceCheck({ userId }: IcpEvidenceCheckProps) {
  const [evidence, setEvidence] = useState<EvidenceState | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const [pmfRes, demoRes, waitlistRes, tractionRes] = await Promise.all([
          supabase
            .from('pmf_analysis_results' as never)
            .select('pmf_score, analysis_data')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabase.rpc('get_mvp_retention_snapshot' as never),
          supabase
            .from('demo_studio_signups' as never)
            .select('id', { count: 'exact', head: true }),
          supabase
            .from('traction_engine_weekly_logs' as never)
            .select('primary_acquisition_channel,channel_quality_signal,prioritized_recommendation')
            .eq('user_id', userId)
            .order('week_start_date', { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        if (!active) return;

        const pmfRow = pmfRes.data as { pmf_score: number | null; analysis_data: Record<string, unknown> } | null;
        const pmfData = (pmfRow?.analysis_data ?? {}) as {
          verdictLabel?: string;
          contradictions?: string[];
          evidenceAnswers?: { interviews?: unknown[] };
          demoEvidence?: { uniqueViewers?: number; completions?: number; signups?: number };
        };
        const demoRow = (Array.isArray(demoRes.data) ? demoRes.data[0] : demoRes.data) as
          | { seven_day_active: number | null; total_visitors: number | null }
          | null;

        setEvidence({
          pmf: pmfRow
            ? {
                score: pmfRow.pmf_score,
                verdictLabel: pmfData.verdictLabel ?? null,
                interviews: Array.isArray(pmfData.evidenceAnswers?.interviews)
                  ? pmfData.evidenceAnswers!.interviews!.length
                  : 0,
                contradictions: Array.isArray(pmfData.contradictions) ? pmfData.contradictions.slice(0, 2) : [],
              }
            : null,
          demo: pmfData.demoEvidence
            ? {
                uniqueViewers: pmfData.demoEvidence.uniqueViewers ?? 0,
                completions: pmfData.demoEvidence.completions ?? 0,
                signups: pmfData.demoEvidence.signups ?? 0,
              }
            : demoRow?.total_visitors
              ? { uniqueViewers: demoRow.total_visitors ?? 0, completions: 0, signups: 0 }
              : null,
          waitlistSignups: waitlistRes.count ?? 0,
          traction: tractionRes.data
            ? {
                channel: String((tractionRes.data as { primary_acquisition_channel?: string }).primary_acquisition_channel ?? ''),
                signal: String((tractionRes.data as { channel_quality_signal?: string }).channel_quality_signal ?? ''),
                recommendation: String((tractionRes.data as { prioritized_recommendation?: string }).prioritized_recommendation ?? ''),
              }
            : null,
        });
      } catch {
        if (active) setEvidence(null);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [userId]);

  if (!evidence) return null;

  const rows: Array<{ tone: Tone; text: string }> = [];

  if (evidence.pmf) {
    const score = evidence.pmf.score ?? 0;
    rows.push({
      tone: score >= 75 ? 'confirm' : score >= 50 ? 'pending' : 'contradict',
      text: `PMF evidence score ${score}/100${evidence.pmf.verdictLabel ? ` (${evidence.pmf.verdictLabel})` : ''} from ${evidence.pmf.interviews} logged interview${evidence.pmf.interviews === 1 ? '' : 's'}.`,
    });
    evidence.pmf.contradictions.forEach((contradiction) => {
      rows.push({ tone: 'contradict', text: contradiction });
    });
  } else {
    rows.push({
      tone: 'pending',
      text: 'No PMF evidence scored yet — this profile is still an untested hypothesis.',
    });
  }

  if (evidence.demo) {
    rows.push({
      tone: evidence.demo.signups > 0 || evidence.demo.completions > 0 ? 'confirm' : 'pending',
      text: `Live behavior: ${evidence.demo.uniqueViewers} unique viewers, ${evidence.demo.completions} demo completions, ${evidence.demo.signups} leads captured.`,
    });
  }

  if (evidence.waitlistSignups > 0) {
    rows.push({
      tone: 'confirm',
      text: `${evidence.waitlistSignups} waitlist/launch-page signup${evidence.waitlistSignups === 1 ? '' : 's'} collected.`,
    });
  }

  if (evidence.traction) {
    const contradictsAudience = /wrong audience|churn quickly|audience fit/i.test(evidence.traction.signal);
    rows.push({
      tone: contradictsAudience ? 'contradict' : 'confirm',
      text: `Traction feedback from ${evidence.traction.channel || 'the primary channel'}: ${evidence.traction.signal} ${evidence.traction.recommendation}`,
    });
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-card p-5">
      <div className="flex items-center gap-2">
        <ScanSearch className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Evidence check — is this ICP holding up?
        </h2>
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((row, index) => (
          <li key={index} className="flex items-start gap-2 text-sm leading-relaxed">
            {toneIcon(row.tone)}
            <span className={row.tone === 'contradict' ? 'text-warning' : 'text-foreground'}>{row.text}</span>
          </li>
        ))}
      </ul>
      {!evidence.pmf && (
        <Link
          to="/pmf-lab"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Test it in PMF Lab <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </section>
  );
}
