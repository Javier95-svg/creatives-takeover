import {
  buildIcpDashboardSnapshot,
  normalizeStoredArtifact,
  type IcpDashboardSnapshot,
} from "./icpDraftArtifacts.ts";

export interface StartupManualProfile {
  startupName: string;
  industries: string[];
  country: string;
  supportAreasNeeded: string[];
  description: string;
  tagline: string;
  stage: string;
  websiteUrl: string;
  positioningLine: string;
  targetMarket: string;
  revenueModel: string;
  links: Record<string, string>;
  userPreferences: Record<string, unknown>;
  updatedAt: string | null;
}

export interface StartupGeneratedProfile {
  icp: {
    id: string;
    snapshot: IcpDashboardSnapshot;
    painPoints: string[];
    competitors: string[];
    competitiveLandscape: string;
    productPositioning: string;
    updatedAt: string | null;
  } | null;
  pmf: {
    id: string;
    score: number | null;
    verdict: string | null;
    summaryInsight: string;
    strengths: string[];
    gaps: string[];
    recommendations: string[];
    updatedAt: string | null;
  } | null;
  techStack: {
    id: string;
    name: string;
    budgetTotal: number;
    selectedTools: string[];
    hasVariableCosts: boolean;
    updatedAt: string | null;
  } | null;
  cycle: {
    waitlist: ToolOutputSummary | null;
    mvp: ToolOutputSummary | null;
    gtm: ToolOutputSummary | null;
  };
}

export interface StartupCommandCenterModel {
  manual: StartupManualProfile;
  generated: StartupGeneratedProfile;
  primaryIndustry: string;
  lastUpdatedAt: string | null;
}

export interface ToolOutputSummary {
  id: string;
  title: string;
  summary: string;
  status: string | null;
  updatedAt: string | null;
}

export interface StartupCommandCenterRows {
  profile: Record<string, any> | null;
  icpRow?: Record<string, any> | null;
  pmfRow?: Record<string, any> | null;
  techStackRow?: Record<string, any> | null;
  waitlistRow?: Record<string, any> | null;
  mvpRow?: Record<string, any> | null;
  gtmRow?: Record<string, any> | null;
}

const STARTUP_PROFILE_PREF_KEY = "startup_profile";

function asRecord(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function compactStrings(values: unknown[], limit = 6): string[] {
  return values
    .flatMap((value) => {
      if (Array.isArray(value)) return value;
      return [value];
    })
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, limit);
}

function getTimestamp(row: Record<string, any> | null | undefined): string | null {
  if (!row) return null;
  return row.saved_at ?? row.exported_at ?? row.published_at ?? row.updated_at ?? row.created_at ?? null;
}

export function selectLatestByTimestamp<T extends Record<string, any>>(rows: T[] | null | undefined): T | null {
  if (!rows?.length) return null;
  return [...rows].sort((a, b) => {
    const aTime = new Date(getTimestamp(a) ?? 0).getTime();
    const bTime = new Date(getTimestamp(b) ?? 0).getTime();
    return bTime - aTime;
  })[0] ?? null;
}

export function normalizeStartupManualProfile(profile: Record<string, any> | null): StartupManualProfile {
  const preferences = asRecord(profile?.user_preferences);
  const startupProfilePrefs = asRecord(preferences[STARTUP_PROFILE_PREF_KEY]);
  const startupLinks = asRecord(profile?.startup_links);

  return {
    startupName: asString(profile?.startup_name),
    industries: asStringArray(profile?.startup_industry),
    country: asString(profile?.country),
    supportAreasNeeded: asStringArray(preferences.supportAreasNeeded),
    description: asString(profile?.startup_description),
    tagline: asString(profile?.startup_tagline),
    stage: asString(profile?.startup_stage || profile?.business_stage),
    websiteUrl: asString(profile?.website_url || startupLinks.website),
    positioningLine: asString(profile?.positioning_line),
    targetMarket: asString(startupProfilePrefs.target_market),
    revenueModel: asString(startupProfilePrefs.revenue_model),
    links: {
      pitchDeck: asString(startupLinks.pitchDeck),
      waitlist: asString(startupLinks.waitlist),
      demo: asString(startupLinks.demo),
      loom: asString(startupLinks.loom),
      website: asString(startupLinks.website || profile?.website_url),
    },
    userPreferences: preferences,
    updatedAt: profile?.updated_at ?? null,
  };
}

export function getPreferredIndustry(manual: StartupManualProfile, icp?: IcpDashboardSnapshot | null): string {
  return manual.industries[0] || icp?.industry || "";
}

function normalizePmfRow(row: Record<string, any> | null | undefined): StartupGeneratedProfile["pmf"] {
  if (!row) return null;
  const analysis = asRecord(row.analysis_data);
  const recommendations = Array.isArray(analysis.recommendations)
    ? analysis.recommendations
        .map((item: unknown) => (typeof item === "string" ? item : asRecord(item).title || asRecord(item).action))
        .filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
        .slice(0, 4)
    : [];

  return {
    id: row.id,
    score:
      typeof row.pmf_score === "number"
        ? row.pmf_score
        : typeof analysis.overallScore === "number"
          ? analysis.overallScore
          : null,
    verdict: asString(row.verdict || analysis.verdictLabel || analysis.verdict) || null,
    summaryInsight: asString(analysis.summaryInsight || analysis.diagnosis),
    strengths: compactStrings([analysis.strengths], 4),
    gaps: compactStrings([analysis.gaps, analysis.improvementsBeforeRetest], 5),
    recommendations,
    updatedAt: getTimestamp(row),
  };
}

function normalizeTechStackRow(row: Record<string, any> | null | undefined): StartupGeneratedProfile["techStack"] {
  if (!row) return null;
  const breakdown = Array.isArray(row.budget_breakdown) ? row.budget_breakdown : [];
  const selectedTools = breakdown
    .map((item: unknown) => asRecord(item).product)
    .filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, 10);

  return {
    id: row.id,
    name: asString(row.name) || "Tech Stack Report",
    budgetTotal: Number(row.budget_total ?? 0),
    selectedTools,
    hasVariableCosts: Boolean(row.has_variable),
    updatedAt: getTimestamp(row),
  };
}

function normalizeWaitlistRow(row: Record<string, any> | null | undefined): ToolOutputSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    title: asString(row.title) || "Waitlist page",
    summary: asString(row.value_proposition || row.target_audience),
    status: asString(row.status) || null,
    updatedAt: getTimestamp(row),
  };
}

function normalizeMvpRow(row: Record<string, any> | null | undefined): ToolOutputSummary | null {
  if (!row) return null;
  return {
    id: row.id,
    title: asString(row.scope_title) || "MVP scope",
    summary: asString(row.scope_summary),
    status: asString(row.status) || null,
    updatedAt: getTimestamp(row),
  };
}

function normalizeGtmRow(row: Record<string, any> | null | undefined): ToolOutputSummary | null {
  if (!row) return null;
  const content = asRecord(row.plan_content);
  return {
    id: row.id,
    title: asString(row.plan_title) || "Go-to-market plan",
    summary: asString(content.summary || content.positioning || content.primary_channel),
    status: asString(row.status) || null,
    updatedAt: getTimestamp(row),
  };
}

function normalizeIcpRow(row: Record<string, any> | null | undefined): StartupGeneratedProfile["icp"] {
  if (!row) return null;
  const normalized = normalizeStoredArtifact(row);
  if (!normalized.artifact) return null;

  const draft = normalized.artifact.draftDocument;
  return {
    id: row.id,
    snapshot: buildIcpDashboardSnapshot(normalized.artifact),
    painPoints: compactStrings([
      draft.pain.quote,
      draft.pain.rootCause,
      draft.pain.whyItHurts,
      draft.pain.costOfInaction,
    ], 4),
    competitors: draft.competition.directCompetitors.map((item) => item.name).slice(0, 6),
    competitiveLandscape: draft.competition.summary || draft.competition.exploitableGap,
    productPositioning: draft.build.valueProposition,
    updatedAt: getTimestamp(row),
  };
}

export function buildStartupCommandCenterModel(rows: StartupCommandCenterRows): StartupCommandCenterModel {
  const manual = normalizeStartupManualProfile(rows.profile);
  const icp = normalizeIcpRow(rows.icpRow);
  const generated: StartupGeneratedProfile = {
    icp,
    pmf: normalizePmfRow(rows.pmfRow),
    techStack: normalizeTechStackRow(rows.techStackRow),
    cycle: {
      waitlist: normalizeWaitlistRow(rows.waitlistRow),
      mvp: normalizeMvpRow(rows.mvpRow),
      gtm: normalizeGtmRow(rows.gtmRow),
    },
  };

  const timestamps = [
    manual.updatedAt,
    generated.icp?.updatedAt,
    generated.pmf?.updatedAt,
    generated.techStack?.updatedAt,
    generated.cycle.waitlist?.updatedAt,
    generated.cycle.mvp?.updatedAt,
    generated.cycle.gtm?.updatedAt,
  ].filter((value): value is string => Boolean(value));

  return {
    manual,
    generated,
    primaryIndustry: getPreferredIndustry(manual, generated.icp?.snapshot),
    lastUpdatedAt: timestamps.length ? selectLatestByTimestamp(timestamps.map((updated_at) => ({ updated_at })))?.updated_at ?? null : null,
  };
}

export function buildStartupProfilePreferences(
  existingPreferences: Record<string, unknown>,
  updates: { targetMarket?: string; revenueModel?: string; supportAreasNeeded?: string[] },
) {
  const existingStartupProfile = asRecord(existingPreferences[STARTUP_PROFILE_PREF_KEY]);
  return {
    ...existingPreferences,
    [STARTUP_PROFILE_PREF_KEY]: {
      ...existingStartupProfile,
      target_market: updates.targetMarket ?? asString(existingStartupProfile.target_market),
      revenue_model: updates.revenueModel ?? asString(existingStartupProfile.revenue_model),
    },
    supportAreasNeeded: updates.supportAreasNeeded ?? asStringArray(existingPreferences.supportAreasNeeded),
  };
}
