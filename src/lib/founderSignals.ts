import { supabase } from '@/integrations/supabase/client';
import type { FounderJourneyExtras } from '@/lib/founderJourney';
import type { ToolCompletionSignals } from '@/lib/taskCalendar';

export async function countLatest(
  table: string,
  userId: string,
  extra?: (query: any) => any,
): Promise<boolean> {
  let query = supabase.from(table as any).select('id', { count: 'exact', head: true }).eq('user_id', userId);
  if (extra) query = extra(query);
  const { count, error } = await query;
  if (error) {
    console.warn(`Unable to read ${table} for founder signals`, error);
    return false;
  }
  return Number(count ?? 0) > 0;
}

export async function fetchToolCompletionSignals(userId: string): Promise<ToolCompletionSignals> {
  const [
    icpCompleted,
    waitlistCompleted,
    pmfScored,
    pmfEvidenceCaptured,
    mvpCompleted,
    techStackCompleted,
    gtmCompleted,
  ] = await Promise.all([
    countLatest('icp_analysis_results', userId),
    countLatest('waitlist_pages', userId, (query) => query.in('status', ['published', 'exported'])),
    countLatest('pmf_analysis_results', userId),
    // The live PMF Lab stores captured signals in pmf_validation_evidence;
    // pmf_analysis_results only fills once an evidence score run completes.
    // Either one satisfies the "add fresh validation evidence" task.
    countLatest('pmf_validation_evidence', userId),
    countLatest('mvp_builder_artifacts', userId, (query) => query.eq('status', 'saved')),
    countLatest('tech_stack_reports', userId),
    countLatest('gtm_plans', userId, (query) => query.in('status', ['saved', 'exported'])),
  ]);

  return {
    icpCompleted,
    waitlistCompleted,
    pmfCompleted: pmfScored || pmfEvidenceCaptured,
    mvpCompleted,
    techStackCompleted,
    gtmCompleted,
  };
}

function warnAndNull<T>(table: string, error: unknown): T | null {
  console.warn(`Unable to read ${table} for founder journey`, error);
  return null;
}

// Cross-tool outputs not covered by ToolCompletionSignals. Every query degrades
// to null on error so a missing table can never blank the dashboard.
export async function fetchFounderJourneyExtras(userId: string): Promise<FounderJourneyExtras> {
  const [tractionRes, demoProjectRes, demoCountRes, pitchRes, mvpRes] = await Promise.all([
    supabase
      .from('traction_engine_weekly_logs' as any)
      .select('combined_score, week_start_date, phase_seven_ready, updated_at')
      .eq('user_id', userId)
      .order('week_start_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('demo_studio_projects' as any)
      .select('name, updated_at')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('demo_studio_demos' as any)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'published'),
    supabase
      .from('pitch_deck_analyses')
      .select('overall_score, verdict, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('mvp_projects' as any)
      .select('subdomain_slug, deployment_url, updated_at')
      .eq('user_id', userId)
      .eq('deployment_status', 'deployed')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const tractionRow = tractionRes.error
    ? warnAndNull<any>('traction_engine_weekly_logs', tractionRes.error)
    : (tractionRes.data as any);
  const demoProjectRow = demoProjectRes.error
    ? warnAndNull<any>('demo_studio_projects', demoProjectRes.error)
    : (demoProjectRes.data as any);
  const publishedDemoCount = demoCountRes.error
    ? (warnAndNull<number>('demo_studio_demos', demoCountRes.error) ?? 0)
    : Number(demoCountRes.count ?? 0);
  const pitchRow = pitchRes.error
    ? warnAndNull<any>('pitch_deck_analyses', pitchRes.error)
    : (pitchRes.data as any);
  const mvpRow = mvpRes.error
    ? warnAndNull<any>('mvp_projects', mvpRes.error)
    : (mvpRes.data as any);

  return {
    traction: tractionRow
      ? {
          latestScore: tractionRow.combined_score ?? null,
          weekStartDate: tractionRow.week_start_date ?? null,
          phaseSevenReady: Boolean(tractionRow.phase_seven_ready),
          updatedAt: tractionRow.updated_at ?? null,
        }
      : null,
    demoStudio: demoProjectRow
      ? {
          projectName: demoProjectRow.name ?? null,
          publishedDemoCount,
          updatedAt: demoProjectRow.updated_at ?? null,
        }
      : null,
    pitchDeck: pitchRow
      ? {
          overallScore: pitchRow.overall_score ?? null,
          verdict: pitchRow.verdict ?? null,
          createdAt: pitchRow.created_at ?? null,
        }
      : null,
    mvpPublished: mvpRow
      ? {
          subdomainSlug: mvpRow.subdomain_slug ?? null,
          deploymentUrl: mvpRow.deployment_url ?? null,
          updatedAt: mvpRow.updated_at ?? null,
        }
      : null,
  };
}
