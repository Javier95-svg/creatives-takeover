import { FOUNDER_TOOL_CATALOG } from '../../../src/config/founderToolCatalog.ts';
import { normalizePlan, resolveEntitlement } from '../../../src/config/planPermissions.ts';
import { canonicalTool, type RetentionContext, type ToolActivity } from './roadmap-retention.ts';

// Supabase query builders differ between the browser and the Edge runtime.
// This boundary intentionally takes the service client's query interface only.
type Database = { from: (table: string) => any };
const record = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
const string = (value: unknown): string | null => typeof value === 'string' && value.trim() ? value.trim() : null;
export function latestTimestamp(values: unknown[]): string | null {
  const dates = values.map(value => typeof value === 'string' ? Date.parse(value) : NaN).filter(Number.isFinite);
  return dates.length ? new Date(Math.max(...dates)).toISOString() : null;
}
export async function loadRoadmapContext(db: Database, userId: string, lastLoginAt: string | null, settings: { tracking_started_at: string; unavailable_tools: string[] }): Promise<RetentionContext> {
  const results = await Promise.all([
    db.from('profiles').select('created_at,quiz_completed,quiz_answers_v2,current_focus,startup_industry,quiz_current_stage,user_preferences,last_seen_at,last_activity_at,last_active_at,subscription_tier').eq('id', userId).single(),
    db.from('retention_user_activity').select('*').eq('user_id', userId).maybeSingle(),
    db.from('retention_tool_activity').select('*').eq('user_id', userId).order('occurred_at', { ascending: false }).limit(1000),
    db.from('journey_outcomes').select('tool,artifact_id,artifact_type,quality_checks,status,completed_at,verified_at,reviewed_at,updated_at').eq('user_id', userId).order('updated_at', { ascending: false }).limit(1000),
    db.from('onboarding_sessions').select('answers').eq('user_id', userId).eq('status', 'completed').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const result of results) if (result.error) throw new Error(`Retention context unavailable: ${result.error.message}`);
  const profile = record(results[0].data);
  const activity = record(results[1].data);
  const events = results[2].data ?? [];
  const outcomes = results[3].data ?? [];
  const answers = record(record(results[4].data).answers);
  const quiz = record(profile.quiz_answers_v2);
  const quizAnswers = record(quiz.answers);
  const plan = normalizePlan(profile.subscription_tier);
  const unavailableTools = [...settings.unavailable_tools, ...FOUNDER_TOOL_CATALOG.filter(tool => {
    const entitlement = resolveEntitlement(tool.entitlement, plan);
    return !entitlement.isVisible || entitlement.uiMode !== 'full';
  }).map(tool => tool.key)];
  const tools: ToolActivity[] = events.map((row: Record<string, any>) => ({
    tool: row.tool, projectId: row.project_id, status: row.status, step: row.step, path: row.path, occurredAt: row.occurred_at,
  }));
  // Persisted outcome rows provide historical completion evidence. Open telemetry never completes a stage.
  for (const outcome of outcomes) {
    tools.push({ tool: outcome.tool, projectId: outcome.artifact_id,
      status: ['ready', 'verified', 'reviewed'].includes(outcome.status) ? 'completed' : 'progress',
      occurredAt: outcome.updated_at, step: null });
  }
  const artifactTables: Record<string, string> = {
    icp_builder: 'icp_analysis_results', demo_studio: 'demo_studio_projects', mvp_builder: 'mvp_projects',
    gtm_strategist: 'gtm_plans', traction_engine: 'traction_engine_weekly_logs', pmf_lab: 'pmf_analysis_results',
  };
  const existence = new Map<string, boolean>();
  for (const item of tools) {
    const tool = canonicalTool(item.tool);
    if (!item.projectId || !tool) continue;
    const table = artifactTables[tool.key];
    if (!table) { item.savedDestinationVerified = false; continue; }
    const key = `${table}:${item.projectId}`;
    if (!existence.has(key)) {
      const result = await db.from(table).select('id').eq('user_id', userId).eq('id', item.projectId).maybeSingle();
      if (result.error) throw new Error(`Retention artifact verification failed: ${result.error.message}`);
      existence.set(key, Boolean(result.data));
    }
    if (!existence.get(key)) { item.status = 'completed'; item.path = null; continue; }
    // ICP has a documented project route. Other tools use only routes recorded by the product itself.
    if (tool.key === 'icp_builder') item.path = `/icp/draft/${encodeURIComponent(item.projectId)}`;
    item.savedDestinationVerified = Boolean(item.path);
  }
  return {
    userId, quizCompleted: profile.quiz_completed === true,
    quizGoal: string(answers.primaryGoal) ?? string(quizAnswers.primaryGoal) ?? string(profile.current_focus),
    industry: Array.isArray(profile.startup_industry) ? profile.startup_industry.filter((v: unknown) => typeof v === 'string').join(', ') : string(profile.startup_industry),
    ideaStage: string(profile.quiz_current_stage), lastLoginAt,
    lastActivityAt: latestTimestamp([lastLoginAt, activity.last_activity_at, profile.last_seen_at, profile.last_activity_at, profile.last_active_at, ...events.map((item: Record<string, any>) => item.occurred_at)]),
    historyComplete: Date.parse(profile.created_at) >= Date.parse(settings.tracking_started_at) && Boolean(activity.last_activity_at) && events.length < 1000 && outcomes.length < 1000,
    tools, unavailableTools,
    marketplaceVisitedAt: string(activity.marketplace_visited_at), expertSupportVisitedAt: string(activity.expert_support_visited_at),
    evidence: { outcomes, firstCustomerSprintCompletedAt: null, fundraisingReadinessCompletedAt: null, pitchDeckCompletedAt: null, savedInvestorCount: 0 },
  };
}
