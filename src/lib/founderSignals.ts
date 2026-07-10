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

function startOfMonthIso(): string {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
}

// Cross-tool outputs not covered by ToolCompletionSignals. Every query degrades
// to null on error so a missing table can never blank the dashboard.
export async function fetchFounderJourneyExtras(userId: string): Promise<FounderJourneyExtras> {
  const monthStart = startOfMonthIso();

  const [
    tractionRes,
    demoProjectsRes,
    demoCountRes,
    pmfScoreRes,
    pitchRes,
    mvpRes,
    waitlistPageRes,
    vcViewsRes,
    acceleratorViewsRes,
  ] = await Promise.all([
    supabase
      .from('traction_engine_weekly_logs' as any)
      .select('combined_score, week_start_date, phase_seven_ready, updated_at')
      .eq('user_id', userId)
      .order('week_start_date', { ascending: false })
      .limit(2),
    supabase
      .from('demo_studio_projects' as any)
      .select('id, name, updated_at')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false }),
    supabase
      .from('demo_studio_demos' as any)
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)
      .eq('status', 'published'),
    supabase
      .from('pmf_analysis_results' as any)
      .select('pmf_score, created_at')
      .eq('user_id', userId)
      .not('pmf_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
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
    supabase
      .from('waitlist_pages' as any)
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('vc_views' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('viewed_at', monthStart),
    supabase
      .from('accelerator_views' as any)
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('viewed_at', monthStart),
  ]);

  const tractionRows = tractionRes.error
    ? (warnAndNull<any[]>('traction_engine_weekly_logs', tractionRes.error) ?? [])
    : ((tractionRes.data as any[]) ?? []);
  const tractionRow = tractionRows[0] ?? null;
  const previousTractionRow = tractionRows[1] ?? null;
  const demoProjectRows = demoProjectsRes.error
    ? (warnAndNull<any[]>('demo_studio_projects', demoProjectsRes.error) ?? [])
    : ((demoProjectsRes.data as any[]) ?? []);
  const demoProjectRow = demoProjectRows[0] ?? null;
  const publishedDemoCount = demoCountRes.error
    ? (warnAndNull<number>('demo_studio_demos', demoCountRes.error) ?? 0)
    : Number(demoCountRes.count ?? 0);
  const pmfScoreRow = pmfScoreRes.error
    ? warnAndNull<any>('pmf_analysis_results', pmfScoreRes.error)
    : (pmfScoreRes.data as any);
  const pitchRow = pitchRes.error
    ? warnAndNull<any>('pitch_deck_analyses', pitchRes.error)
    : (pitchRes.data as any);
  const mvpRow = mvpRes.error
    ? warnAndNull<any>('mvp_projects', mvpRes.error)
    : (mvpRes.data as any);
  const waitlistPageRow = waitlistPageRes.error
    ? warnAndNull<any>('waitlist_pages', waitlistPageRes.error)
    : (waitlistPageRes.data as any);
  const vcViews = vcViewsRes.error
    ? (warnAndNull<number>('vc_views', vcViewsRes.error) ?? 0)
    : Number(vcViewsRes.count ?? 0);
  const acceleratorViews = acceleratorViewsRes.error
    ? (warnAndNull<number>('accelerator_views', acceleratorViewsRes.error) ?? 0)
    : Number(acceleratorViewsRes.count ?? 0);

  // Demand signups depend on the ids fetched above, so they run as a second stage.
  const demoProjectIds = demoProjectRows.map((row) => row.id).filter(Boolean);
  const [demoSignupsRes, waitlistSignupsRes] = await Promise.all([
    demoProjectIds.length > 0
      ? supabase
          .from('demo_studio_signups' as any)
          .select('id', { count: 'exact', head: true })
          .in('project_id', demoProjectIds)
      : Promise.resolve({ count: 0, error: null } as { count: number | null; error: null }),
    waitlistPageRow?.id
      ? supabase
          .from('waitlist_signups' as any)
          .select('id', { count: 'exact', head: true })
          .eq('waitlist_page_id', waitlistPageRow.id)
      : Promise.resolve({ count: 0, error: null } as { count: number | null; error: null }),
  ]);

  const demoSignups = demoSignupsRes.error
    ? (warnAndNull<number>('demo_studio_signups', demoSignupsRes.error) ?? 0)
    : Number(demoSignupsRes.count ?? 0);
  const waitlistSignups = waitlistSignupsRes.error
    ? (warnAndNull<number>('waitlist_signups', waitlistSignupsRes.error) ?? 0)
    : Number(waitlistSignupsRes.count ?? 0);
  const fundraisingViews = vcViews + acceleratorViews;

  return {
    traction: tractionRow
      ? {
          latestScore: tractionRow.combined_score ?? null,
          previousScore: previousTractionRow?.combined_score ?? null,
          weekStartDate: tractionRow.week_start_date ?? null,
          phaseSevenReady: Boolean(tractionRow.phase_seven_ready),
          updatedAt: tractionRow.updated_at ?? null,
        }
      : null,
    demoStudio: demoProjectRow
      ? {
          projectName: demoProjectRow.name ?? null,
          publishedDemoCount,
          signupCount: demoSignups + waitlistSignups,
          updatedAt: demoProjectRow.updated_at ?? null,
        }
      : null,
    pmf: pmfScoreRow
      ? {
          latestScore: pmfScoreRow.pmf_score != null ? Number(pmfScoreRow.pmf_score) : null,
          scoredAt: pmfScoreRow.created_at ?? null,
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
    fundraisingActivity: fundraisingViews > 0 ? { viewsThisMonth: fundraisingViews } : null,
  };
}
