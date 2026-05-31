import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getAccessTokenSafely, getSessionSafely } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditActions } from '@/hooks/useCreditActions';
import { useCredits } from '@/hooks/useCredits';
import { createIdempotencyKey } from '@/lib/idempotency';
import { toast } from 'sonner';
import {
  MVP_DEFAULT_MODEL,
  sanitizeMVPModelSelection,
} from '@/data/mvpModels';
import {
  MVP_DEFAULT_PROJECT_TYPE,
  sanitizeMVPProjectType,
} from '@/data/mvpProjectTypes';
import type { CreditFeature } from '@/config/constants';
import { CREDIT_COSTS } from '@/config/constants';
import {
  buildPreviewFromProject,
  createProjectFromHtml,
  detectProjectFileLanguage,
  extractHtmlFromText,
  extractProjectDependenciesFromFiles,
  extractProjectFromText,
  getChangedProjectFiles,
  inferProjectFramework,
  normalizeProjectFiles,
  normalizeProjectPath,
  pickProjectEntryFile,
  type MVPPreviewResult,
  type MVPProjectArtifact,
  type MVPProjectSnapshot,
  type MVPProjectFile,
  type MVPProjectFramework,
  type MVPProjectType,
} from '@/lib/mvp-builder/project';
import {
  buildMVPProjectZip,
  classifyMVPBuilderAction,
  createMVPBuilderVersion,
  MVP_BUILDER_ACTION_CREDIT_FEATURE,
  parseMVPBuilderOutput,
  sanitizeMVPBuilderPalette,
  sanitizeMVPBuilderTemplate,
  validateMVPBuilderOutput,
  type MVPBuilderActionType,
  type MVPBuilderSetupInput,
  type MVPBuilderTemplateId,
  type MVPBuilderValidatedOutput,
  type MVPBuilderVersion,
} from '@/lib/mvp-builder/phase1';
import {
  buildStartupCommandCenterModel,
  type StartupCommandCenterModel,
} from '@/lib/startupCommandCenter';
import {
  classifyIntegrationStatus,
  getMVPIntegrationReady,
  type MVPBuilderIntegrationsHealth,
  type MVPIntegrationStatus,
} from '@/lib/mvp-builder/integrations';

export interface MVPMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
  model?: string;
  type?: 'message' | 'error';
  linkedPrompt?: string;
  retryPrompt?: string;
}

export interface MVPPromptHistoryItem {
  id: string;
  prompt: string;
  committedAt: string;
  commitRef?: string;
  commitUrl?: string;
  pullRequestUrl?: string;
  branch?: string;
}

export interface GitHubConnectionState {
  connected: boolean;
  status?: MVPIntegrationStatus;
  lastError?: string | null;
  expiresAt?: string | null;
  connectionId?: string;
  profile: {
    login?: string;
    name?: string | null;
    avatar_url?: string | null;
    scope?: string;
  } | null;
  repository?: {
    fullName: string;
    htmlUrl?: string | null;
    branch: string;
    defaultBranch: string;
    baseCommitSha?: string | null;
  } | null;
}

export interface SupabaseConnectionState {
  connected: boolean;
  status: MVPIntegrationStatus;
  lastError?: string | null;
  expiresAt?: string | null;
  connectionId?: string;
  scopes?: string[];
  project: {
    ref: string;
    name: string;
    region?: string | null;
    status?: string | null;
    organizationId?: string | null;
    organizationName?: string | null;
  } | null;
}

export interface SupabaseProjectSummary {
  id?: string;
  ref: string;
  name: string;
  region?: string | null;
  status?: string | null;
  organizationId?: string | null;
  organizationName?: string | null;
}

export interface GitHubRepositorySummary {
  id: string;
  name: string;
  fullName: string;
  private: boolean;
  defaultBranch: string;
  htmlUrl?: string | null;
  updatedAt?: string;
}

export interface GitHubRepoFile {
  path: string;
  content: string;
  size?: number;
}

export type GitHubChangeAction = 'create' | 'update' | 'delete';

export interface GitHubFileChange {
  path: string;
  action: GitHubChangeAction;
  content?: string;
  reason?: string;
  previousContent?: string;
}

export interface GitHubRepoSession {
  owner: string;
  name: string;
  fullName: string;
  branch: string;
  defaultBranch: string;
  baseCommitSha: string;
  htmlUrl?: string | null;
  files: GitHubRepoFile[];
  importedAt: string;
}

type WaitlistPrefillRow = {
  title?: string | null;
  value_proposition?: string | null;
  target_audience?: string | null;
  metadata?: {
    projectContext?: {
      positioningStatement?: string | null;
    };
    waitlistLaunchKit?: {
      current?: {
        output?: unknown;
        inputs?: {
          description?: string | null;
          audience?: string | null;
          primaryBenefit?: string | null;
          tagline?: string | null;
        };
      };
    };
  } | null;
};

type ProfilePrefillRow = Record<string, unknown> & {
  startup_name?: string | null;
  startup_description?: string | null;
  startup_tagline?: string | null;
  startup_stage?: string | null;
  business_stage?: string | null;
  startup_industry?: string[] | null;
  country?: string | null;
  positioning_line?: string | null;
  user_preferences?: Record<string, unknown> | null;
  quiz_current_stage?: string | null;
  quiz_biggest_challenge?: string | null;
  quiz_answers_v2?: Record<string, unknown> | null;
  current_focus?: string | null;
  updated_at?: string | null;
};

type ICPPrefillRow = Record<string, unknown> & {
  product_name?: string | null;
  business_name?: string | null;
  one_line_description?: string | null;
  summary?: string | null;
  problem_statement?: string | null;
  target_audience?: string | null;
  pain_points?: string[] | string | null;
};

type MVPBuilderContextPrefillSource = NonNullable<MVPBuilderSetupInput['prefillSource']>;

export interface GitHubCommitRecord {
  sha: string;
  shortSha: string;
  message: string;
  committedAt: string | null;
  url?: string | null;
  author?: string | null;
}

export interface MVPProjectRecord {
  id: string;
  title: string;
  prompt_history: MVPMessage[];
  generated_code: string | null;
  project_type?: 'html_single' | 'react_multi' | 'react_vite';
  template?: MVPBuilderTemplateId;
  project_files?: Array<{ filename?: string; path?: string; content: string; description?: string }>;
  versions?: MVPBuilderVersion[];
  deployment_url?: string | null;
  deployment_slug?: string | null;
  deployment_status?: 'not_deployed' | 'deploying' | 'deployed' | 'failed';
  github_connection_id?: string | null;
  supabase_connection_id?: string | null;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type MVPBuilderResponseMode = 'chat' | 'build';

export interface MVPBuildChangeSummary {
  id: string;
  prompt: string;
  createdAt: string;
  updatedSections: number;
  addedComponents: number;
  details: Array<{
    id: string;
    type: 'updated' | 'added' | 'removed';
    from?: string;
    to?: string;
  }>;
}

interface PersistedSession {
  messages: MVPMessage[];
  currentHtml: string | null;
  generatedCode?: string | null;
  currentProject?: MVPProjectArtifact | null;
  projectName: string;
  projectId: string;
  lastSavedAt?: string | null;
  hasUnsavedChanges?: boolean;
  promptHistory: MVPPromptHistoryItem[];
  selectedModels: string[];
  selectedProjectType?: MVPProjectType;
  projectSnapshots?: MVPProjectSnapshot[];
  githubRepoSession?: GitHubRepoSession | null;
  githubPendingChanges?: GitHubFileChange[];
  githubCommitHistory?: GitHubCommitRecord[];
  lastGitHubPrompt?: string | null;
  suggestedGitHubCommitMessage?: string | null;
  selectedCodeFilePath?: string | null;
  lastGeneratedProject?: MVPProjectArtifact | null;
  setupInput?: MVPBuilderSetupInput;
  projectVersions?: MVPBuilderVersion[];
  lastActionQuote?: MVPActionQuote | null;
  deploymentUrl?: string | null;
}

export interface MVPActionQuote {
  actionType: MVPBuilderActionType | 'unclear' | 'unsupported';
  creditFeature: CreditFeature | null;
  creditCost: number;
}

type FunctionError = Error & { status?: number };

const DEFAULT_PROJECT_NAME = 'Untitled Project';
const MVP_PROJECTS_TABLE = 'mvp_projects';

function createMessage(
  role: MVPMessage['role'],
  content: string,
  extras: Partial<MVPMessage> = {}
): MVPMessage {
  return {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
    type: 'message',
    ...extras,
  };
}

function buildPromptHistoryFromMessages(messages: MVPMessage[]): MVPPromptHistoryItem[] {
  const prompts = messages.filter((message) => message.role === 'user' && message.content.trim());
  return sortHistory(
    prompts.map((message) => ({
      id: message.id,
      prompt: message.content,
      committedAt: message.createdAt ?? new Date().toISOString(),
      commitRef: `prompt-${message.id.slice(0, 8)}`,
    }))
  );
}

function extractGeneratedCode(
  files: MVPProjectFile[],
  entryFilePath: string,
  html: string | null
): string {
  const preferredEntry =
    files.find((file) => file.path === entryFilePath) ??
    files.find((file) => file.path.toLowerCase().endsWith('.html')) ??
    files[0];
  if (preferredEntry?.content) return preferredEntry.content;
  return html ?? '';
}

function sanitizeStreamedCode(value: string): string {
  return value
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function sortHistory(items: MVPPromptHistoryItem[]): MVPPromptHistoryItem[] {
  return [...items].sort(
    (a, b) =>
      new Date(b.committedAt).getTime() - new Date(a.committedAt).getTime()
  );
}

function shortSha(sha: string): string {
  return sha.slice(0, 8);
}

function extractSectionLabelsFromHtml(html: string): string[] {
  const labels: string[] = [];
  const sectionRegex = /<section\b([^>]*)>([\s\S]*?)<\/section>/gi;

  for (const match of html.matchAll(sectionRegex)) {
    const attrs = match[1] ?? '';
    const body = match[2] ?? '';
    const headingMatch = body.match(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/i);
    const idMatch = attrs.match(/\bid=(["'])(.*?)\1/i);
    const rawLabel = headingMatch?.[1] ?? idMatch?.[2] ?? '';
    const label = rawLabel
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (label) {
      labels.push(label);
    }
  }

  return labels.slice(0, 8);
}

function buildChangeSummary(
  prompt: string,
  baselineFiles: MVPProjectFile[],
  nextProject: MVPProjectArtifact
): MVPBuildChangeSummary {
  const changedFiles = getChangedProjectFiles(nextProject.files, baselineFiles);
  const previousEntry =
    pickProjectEntryFile(baselineFiles, null) ??
    baselineFiles.find((file) => file.path.toLowerCase().endsWith('.html'))?.path ??
    baselineFiles[0]?.path ??
    null;
  const nextEntry =
    pickProjectEntryFile(nextProject.files, nextProject.entryFile) ??
    nextProject.files.find((file) => file.path.toLowerCase().endsWith('.html'))?.path ??
    nextProject.files[0]?.path ??
    null;
  const previousHtml =
    baselineFiles.find((file) => file.path === previousEntry)?.content ?? '';
  const nextHtml =
    nextProject.files.find((file) => file.path === nextEntry)?.content ?? '';
  const previousSections = previousHtml ? extractSectionLabelsFromHtml(previousHtml) : [];
  const nextSections = nextHtml ? extractSectionLabelsFromHtml(nextHtml) : [];

  const details: MVPBuildChangeSummary['details'] = [];
  const maxLength = Math.max(previousSections.length, nextSections.length);

  for (let index = 0; index < maxLength; index += 1) {
    const before = previousSections[index];
    const after = nextSections[index];

    if (before && after && before !== after) {
      details.push({
        id: `${index}-updated`,
        type: 'updated',
        from: before,
        to: after,
      });
      continue;
    }

    if (!before && after) {
      details.push({
        id: `${index}-added`,
        type: 'added',
        to: after,
      });
      continue;
    }

    if (before && !after) {
      details.push({
        id: `${index}-removed`,
        type: 'removed',
        from: before,
      });
    }
  }

  const fileFallbackDetails =
    details.length > 0
      ? details
      : changedFiles.slice(0, 4).map((change, index) => ({
          id: `${index}-${change.status}`,
          type: change.status === 'added' ? ('added' as const) : ('updated' as const),
          from: change.status === 'added' ? undefined : change.path,
          to: change.path,
        }));

  return {
    id: crypto.randomUUID(),
    prompt,
    createdAt: new Date().toISOString(),
    updatedSections:
      fileFallbackDetails.filter((detail) => detail.type === 'updated').length ||
      changedFiles.filter((change) => change.status === 'modified').length,
    addedComponents: changedFiles.filter((change) => change.status === 'added').length,
    details: fileFallbackDetails,
  };
}

function promptRequestsFrameworkRuntime(prompt: string): MVPProjectFramework | null {
  const normalizedPrompt = prompt.toLowerCase();
  if (/\bnext\.?js\b|\bnext\b|\bapp router\b|\bpage router\b/.test(normalizedPrompt)) {
    return 'next-like';
  }

  if (
    /\breact\b|\bvite\b|\btsx\b|\bjsx\b|\bcomponent\b|\bsingle[- ]page\b|\bspa\b/.test(
      normalizedPrompt
    )
  ) {
    return 'react-vite';
  }

  return null;
}

function resolvePreferredFramework(
  prompt: string,
  selectedProjectType: MVPProjectType,
  existingFramework?: MVPProjectFramework | null
): MVPProjectFramework {
  const requestedFramework = promptRequestsFrameworkRuntime(prompt);
  if (requestedFramework) {
    return requestedFramework;
  }

  if (existingFramework === 'static-html') {
    return 'static-html';
  }

  if (selectedProjectType === 'landing-page') {
    return 'static-html';
  }

  return 'static-html';
}

function normalizeSnapshotArtifact(artifact: MVPProjectArtifact): MVPProjectArtifact {
  const normalizedFiles = normalizeProjectFiles(artifact.files);
  const inferredFramework = inferProjectFramework(normalizedFiles, artifact.framework);
  const fileDependencies = extractProjectDependenciesFromFiles(normalizedFiles);
  return {
    ...artifact,
    framework: inferredFramework,
    projectType: sanitizeMVPProjectType(artifact.projectType),
    summary:
      typeof artifact.summary === 'string' && artifact.summary.trim()
        ? artifact.summary.trim()
        : 'Generated with MVP Builder.',
    dependencies:
      Array.isArray(artifact.dependencies) && artifact.dependencies.length > 0
        ? artifact.dependencies
        : fileDependencies,
    files: normalizedFiles,
    entryFile:
      pickProjectEntryFile(normalizedFiles, artifact.entryFile) ??
      normalizedFiles[0]?.path ??
      'index.html',
  };
}

function createProjectSnapshot(
  artifact: MVPProjectArtifact,
  label: string,
  source: MVPProjectSnapshot['source']
): MVPProjectSnapshot {
  return {
    id: crypto.randomUUID(),
    label,
    createdAt: new Date().toISOString(),
    source,
    artifact: normalizeSnapshotArtifact(artifact),
  };
}

function mergeSnapshots(
  previous: MVPProjectSnapshot[],
  nextSnapshot: MVPProjectSnapshot,
  limit = 12
): MVPProjectSnapshot[] {
  const deduped = [nextSnapshot, ...previous.filter((snapshot) => snapshot.label !== nextSnapshot.label)];
  return deduped.slice(0, limit);
}

function applyChangesToFiles(
  files: GitHubRepoFile[],
  changes: GitHubFileChange[]
): GitHubRepoFile[] {
  const map = new Map<string, GitHubRepoFile>(
    files.map((file) => [file.path, { ...file }])
  );

  for (const change of changes) {
    if (change.action === 'delete') {
      map.delete(change.path);
      continue;
    }
    const content = change.content ?? '';
    const size = new Blob([content]).size;
    map.set(change.path, {
      path: change.path,
      content,
      size,
    });
  }

  return Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path));
}

function mapRepoFilesToProjectFiles(files: GitHubRepoFile[]): MVPProjectFile[] {
  return normalizeProjectFiles(
    files.map((file) => ({
      path: file.path,
      content: file.content,
      language: detectProjectFileLanguage(file.path),
    }))
  );
}

function createProjectArtifactFromRepo(
  name: string,
  files: GitHubRepoFile[],
  preferredEntryFile?: string | null
): MVPProjectArtifact {
  const projectFiles = mapRepoFilesToProjectFiles(files);
  const inferredFramework = inferProjectFramework(projectFiles);
  const entryFile =
    pickProjectEntryFile(projectFiles, preferredEntryFile) ??
    preferredEntryFile ??
    projectFiles[0]?.path ??
    'index.html';
  return {
    projectName: name,
    framework: inferredFramework,
    projectType: 'web-app',
    entryFile,
    summary: 'Imported from GitHub.',
    dependencies: extractProjectDependenciesFromFiles(projectFiles),
    files: projectFiles,
  };
}

const STREAM_URL =
  'https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/mvp-builder-generate';
const GITHUB_FN_URL =
  'https://rcjlaybjnozqbsoxzboa.supabase.co/functions/v1/github-integration';
const SUPABASE_INTEGRATION_FN_URL = `${
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://rcjlaybjnozqbsoxzboa.supabase.co'
}/functions/v1/supabase-integration`;
const STORAGE_KEY = 'ct_app_builder_session';

function getMVPActionFeature(options: {
  hasGithubRepo: boolean;
  responseMode: MVPBuilderResponseMode;
  hasMessages: boolean;
}): CreditFeature {
  if (options.hasGithubRepo) return 'APP_BUILDER_GITHUB_EDIT';
  if (options.responseMode === 'chat') return 'APP_BUILDER_CHAT';
  return options.hasMessages ? 'APP_BUILDER_REFINE' : 'APP_BUILDER_GENERATE';
}

function getMVPActionLabel(feature: CreditFeature): string {
  switch (feature) {
    case 'APP_BUILDER_GENERATE':
      return 'MVP Builder - Generate';
    case 'APP_BUILDER_DEBUG':
      return 'MVP Builder - Bug Fix';
    case 'APP_BUILDER_DEPLOY':
      return 'MVP Builder - Deploy';
    case 'APP_BUILDER_RESTORE':
      return 'MVP Builder - Restore';
    case 'APP_BUILDER_EXPORT':
      return 'MVP Builder - Export';
    case 'APP_BUILDER_CHAT':
      return 'MVP Builder - Chat';
    case 'APP_BUILDER_GITHUB_EDIT':
      return 'MVP Builder - GitHub Edit';
    case 'APP_BUILDER_REFINE':
    default:
      return 'MVP Builder - Refine';
  }
}

function createDefaultSetupInput(): MVPBuilderSetupInput {
  return {
    productName: '',
    oneLineDescription: '',
    validatedProblemStatement: '',
    validatedTargetSegment: '',
    keyPainLanguage: '',
    existingTagline: '',
    template: 'waitlist_landing',
    palettePreference: 'minimal',
    customPrompt: '',
    prefillSource: null,
  };
}

function asRecordValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim());
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = asText(value);
    if (text) return text;
  }
  return '';
}

function joinContextLines(values: unknown[], limit = 5): string {
  return values
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => asText(value))
    .filter(Boolean)
    .slice(0, limit)
    .join(' ');
}

function sourceLabel(source: MVPBuilderContextPrefillSource | null): MVPBuilderContextPrefillSource | null {
  return source;
}

function inferPrefillSource(params: {
  hasWaitlistKit: boolean;
  dashboardModel: StartupCommandCenterModel;
  profile: ProfilePrefillRow | null;
  icp: ICPPrefillRow | null;
}): MVPBuilderContextPrefillSource | null {
  if (params.hasWaitlistKit) return 'waitlist_launch_kit';
  const manual = params.dashboardModel.manual;
  if (
    manual.startupName ||
    manual.description ||
    manual.positioningLine ||
    manual.targetMarket ||
    params.dashboardModel.generated.pmf ||
    params.dashboardModel.generated.techStack ||
    params.dashboardModel.generated.cycle.waitlist ||
    params.dashboardModel.generated.cycle.gtm
  ) {
    return 'dashboard_home';
  }
  const preferences = asRecordValue(params.profile?.user_preferences);
  if (
    params.profile?.quiz_current_stage ||
    params.profile?.quiz_biggest_challenge ||
    params.profile?.business_stage ||
    preferences.primaryPain ||
    preferences.founderStageLabel
  ) {
    return 'onboarding_quiz';
  }
  if (params.icp || params.dashboardModel.generated.icp) return 'icp';
  return null;
}

function buildMVPSetupPrefill(params: {
  profile: ProfilePrefillRow | null;
  waitlist: WaitlistPrefillRow | null;
  icp: ICPPrefillRow | null;
  dashboardModel: StartupCommandCenterModel;
}): Partial<MVPBuilderSetupInput> {
  const { profile, waitlist, icp, dashboardModel } = params;
  const manual = dashboardModel.manual;
  const generatedIcp = dashboardModel.generated.icp;
  const preferences = asRecordValue(profile?.user_preferences);
  const startupProfilePrefs = asRecordValue(preferences.startup_profile);
  const launchKit = waitlist?.metadata?.waitlistLaunchKit?.current;
  const waitlistContext = waitlist?.metadata?.projectContext;
  const hasWaitlistKit = Boolean(waitlistContext?.positioningStatement || launchKit?.output);
  const source = inferPrefillSource({ hasWaitlistKit, dashboardModel, profile, icp });
  const painPoints = Array.isArray(icp?.pain_points) ? icp.pain_points : [icp?.pain_points];
  const supportAreas = asTextArray(preferences.supportAreasNeeded);
  const primaryPain = firstText(preferences.primaryPain, profile?.quiz_biggest_challenge);
  const targetMarket = firstText(
    manual.targetMarket,
    startupProfilePrefs.target_market,
    generatedIcp?.snapshot.roleLine,
    generatedIcp?.snapshot.personaName,
    launchKit?.inputs?.audience,
    waitlist?.target_audience,
    icp?.target_audience,
    icp?.target_segment,
    icp?.ideal_customer_profile
  );

  return {
    productName: firstText(manual.startupName, waitlist?.title, icp?.product_name, icp?.business_name),
    oneLineDescription: firstText(
      manual.positioningLine,
      waitlistContext?.positioningStatement,
      generatedIcp?.productPositioning,
      generatedIcp?.snapshot.valueProposition,
      manual.description,
      waitlist?.value_proposition,
      icp?.one_line_description,
      icp?.summary
    ),
    validatedProblemStatement: firstText(
      primaryPain,
      generatedIcp?.snapshot.corePainPoint,
      joinContextLines(generatedIcp?.painPoints ?? []),
      launchKit?.inputs?.description,
      icp?.problem_statement,
      icp?.primary_pain_point,
      manual.description,
      waitlist?.value_proposition
    ),
    validatedTargetSegment: targetMarket,
    keyPainLanguage: firstText(
      launchKit?.inputs?.primaryBenefit,
      generatedIcp?.snapshot.corePainPoint,
      joinContextLines(painPoints),
      icp?.customer_language,
      icp?.pain_language,
      primaryPain,
      supportAreas.length ? `Needs help with ${supportAreas.join(', ')}` : ''
    ),
    existingTagline: firstText(manual.tagline, launchKit?.inputs?.tagline, profile?.startup_tagline),
    prefillSource: sourceLabel(source),
  };
}

function buildMVPStartupContext(params: {
  profile: ProfilePrefillRow | null;
  waitlist: WaitlistPrefillRow | null;
  icp: ICPPrefillRow | null;
  dashboardModel: StartupCommandCenterModel;
  source: MVPBuilderContextPrefillSource | null;
}): Record<string, unknown> {
  const { profile, waitlist, icp, dashboardModel, source } = params;
  const preferences = asRecordValue(profile?.user_preferences);
  const startupProfilePrefs = asRecordValue(preferences.startup_profile);
  const launchKit = waitlist?.metadata?.waitlistLaunchKit?.current;

  return {
    source,
    onboardingQuiz: {
      businessStage: profile?.business_stage ?? null,
      quizCurrentStage: profile?.quiz_current_stage ?? null,
      quizBiggestChallenge: profile?.quiz_biggest_challenge ?? null,
      assignedStage: profile?.assigned_stage ?? null,
      founderStageLabel: preferences.founderStageLabel ?? null,
      activationIntent: preferences.activationIntent ?? null,
      primaryPain: preferences.primaryPain ?? null,
      startupSectors: preferences.startupSectors ?? profile?.startup_industry ?? [],
      supportAreasNeeded: preferences.supportAreasNeeded ?? [],
      country: preferences.country ?? profile?.country ?? null,
      quizAnswers: profile?.quiz_answers_v2 ?? null,
    },
    dashboardHome: {
      manualProfile: dashboardModel.manual,
      primaryIndustry: dashboardModel.primaryIndustry,
      generated: dashboardModel.generated,
      currentFocus: profile?.current_focus ?? null,
      targetMarket: startupProfilePrefs.target_market ?? dashboardModel.manual.targetMarket,
      revenueModel: startupProfilePrefs.revenue_model ?? dashboardModel.manual.revenueModel,
      lastUpdatedAt: dashboardModel.lastUpdatedAt,
    },
    waitlistLaunchKit: launchKit
      ? {
          inputs: launchKit.inputs ?? null,
          hasOutput: Boolean(launchKit.output),
          positioningStatement: waitlist?.metadata?.projectContext?.positioningStatement ?? null,
        }
      : null,
    icpFallback: icp,
  };
}

async function fetchLatestContextRow(
  table: string,
  userId: string,
  select: string,
  orderColumn = 'updated_at'
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from(table as never)
    .select(select)
    .eq('user_id', userId)
    .order(orderColumn, { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data as Record<string, unknown> | null;
}

async function fetchContextRowById(
  table: string,
  userId: string,
  id: string,
  select: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from(table as never)
    .select(select)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data as Record<string, unknown> | null;
}

export function useMVPBuilder() {
  const { user } = useAuth();
  const {
    ensureCredits,
    handleCreditError,
    reserveMVPBuilderCredits,
    finalizeMVPBuilderCredits,
    releaseMVPBuilderCredits,
  } = useCreditActions();
  const {
    totalAvailable: creditsAvailable,
    heldCredits,
    refreshBalance: refreshCredits,
    loading: creditsLoading,
  } = useCredits();

  const [messages, setMessages] = useState<MVPMessage[]>([]);
  const [projectFiles, setProjectFiles] = useState<MVPProjectFile[]>([]);
  const [entryFilePath, setEntryFilePathState] = useState<string>('index.html');
  const [projectFramework, setProjectFramework] = useState<MVPProjectFramework>('static-html');
  const [selectedProjectType, setSelectedProjectTypeState] =
    useState<MVPProjectType>(MVP_DEFAULT_PROJECT_TYPE);
  const [projectSummary, setProjectSummary] = useState('Generated with MVP Builder.');
  const [projectDependencies, setProjectDependencies] = useState<
    MVPProjectArtifact['dependencies']
  >([]);
  const [currentHtml, setCurrentHtml] = useState<string | null>(null);
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [previewState, setPreviewState] = useState<MVPPreviewResult>({
    html: null,
    entryFile: null,
    canPreview: false,
    warnings: [],
    errors: [],
    runtimeMode: 'none',
    consoleHints: [],
  });
  const [selectedCodeFilePath, setSelectedCodeFilePath] = useState<string | null>(null);
  const [lastGeneratedProject, setLastGeneratedProject] = useState<MVPProjectArtifact | null>(null);
  const [projectSnapshots, setProjectSnapshots] = useState<MVPProjectSnapshot[]>([]);
  const [lastBuildChangeSummary, setLastBuildChangeSummary] = useState<MVPBuildChangeSummary | null>(null);
  const [isShowingPreviewFallback, setIsShowingPreviewFallback] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreditExhaustedModalOpen, setIsCreditExhaustedModalOpen] = useState(false);
  const [projectName, setProjectNameState] = useState(DEFAULT_PROJECT_NAME);
  const [projectId, setProjectId] = useState<string>(() => crypto.randomUUID());
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [savedProjects, setSavedProjects] = useState<MVPProjectRecord[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [promptHistory, setPromptHistory] = useState<MVPPromptHistoryItem[]>([]);
  const [selectedModels, setSelectedModelsState] = useState<string[]>([MVP_DEFAULT_MODEL]);
  const [setupInput, setSetupInputState] = useState<MVPBuilderSetupInput>(() => createDefaultSetupInput());
  const [startupContext, setStartupContext] = useState<Record<string, unknown> | null>(null);
  const [projectVersions, setProjectVersions] = useState<MVPBuilderVersion[]>([]);
  const [lastActionQuote, setLastActionQuote] = useState<MVPActionQuote | null>(null);
  const [deploymentUrl, setDeploymentUrl] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);

  const [githubConnection, setGitHubConnection] = useState<GitHubConnectionState>({
    connected: false,
    status: 'disconnected',
    profile: null,
    repository: null,
  });
  const [githubRepositories, setGitHubRepositories] = useState<GitHubRepositorySummary[]>([]);
  const [githubBranches, setGitHubBranches] = useState<string[]>([]);
  const [githubRepoSession, setGitHubRepoSession] = useState<GitHubRepoSession | null>(null);
  const [githubPendingChanges, setGitHubPendingChanges] = useState<GitHubFileChange[]>([]);
  const [githubCommitHistory, setGitHubCommitHistory] = useState<GitHubCommitRecord[]>([]);
  const [lastGitHubPrompt, setLastGitHubPrompt] = useState<string | null>(null);
  const [suggestedGitHubCommitMessage, setSuggestedGitHubCommitMessage] = useState<string | null>(null);
  const [isGitHubBusy, setIsGitHubBusy] = useState(false);
  const [supabaseConnection, setSupabaseConnection] = useState<SupabaseConnectionState>({
    connected: false,
    status: 'disconnected',
    project: null,
  });
  const [supabaseProjects, setSupabaseProjects] = useState<SupabaseProjectSummary[]>([]);
  const [supabaseBackendSnapshot, setSupabaseBackendSnapshot] = useState<Record<string, unknown> | null>(null);
  const [isSupabaseBusy, setIsSupabaseBusy] = useState(false);

  const integrations = useMemo<MVPBuilderIntegrationsHealth>(
    () => ({
      github: {
        connected: Boolean(githubConnection.connected && githubRepoSession?.fullName),
        status: githubConnection.connected && githubRepoSession?.fullName
          ? classifyIntegrationStatus({
              connected: true,
              status: githubConnection.status,
              lastError: githubConnection.lastError,
              expiresAt: githubConnection.expiresAt,
            })
          : 'disconnected',
        lastError: githubConnection.lastError ?? null,
        expiresAt: githubConnection.expiresAt ?? null,
      },
      supabase: {
        connected: Boolean(supabaseConnection.connected && supabaseConnection.project?.ref),
        status: supabaseConnection.connected && supabaseConnection.project?.ref
          ? classifyIntegrationStatus({
              connected: true,
              status: supabaseConnection.status,
              lastError: supabaseConnection.lastError,
              expiresAt: supabaseConnection.expiresAt,
            })
          : 'disconnected',
        lastError: supabaseConnection.lastError ?? null,
        expiresAt: supabaseConnection.expiresAt ?? null,
      },
    }),
    [
      githubConnection.connected,
      githubConnection.expiresAt,
      githubConnection.lastError,
      githubConnection.status,
      githubRepoSession?.fullName,
      supabaseConnection.connected,
      supabaseConnection.expiresAt,
      supabaseConnection.lastError,
      supabaseConnection.project?.ref,
      supabaseConnection.status,
    ]
  );
  const integrationReady = useMemo(() => getMVPIntegrationReady(integrations), [integrations]);

  const abortRef = useRef<AbortController | null>(null);
  const lastStablePreviewHtmlRef = useRef<string | null>(null);
  const markProjectDirty = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  const replaceMessages = useCallback((nextMessages: MVPMessage[]) => {
    setMessages(nextMessages);
    setPromptHistory(buildPromptHistoryFromMessages(nextMessages));
  }, []);

  const refreshPreview = useCallback(
    (
      files: MVPProjectFile[],
      preferredEntryFile?: string | null,
      options?: { allowFallback?: boolean }
    ) => {
      const nextPreview = buildPreviewFromProject(files, preferredEntryFile);
      const nextEntryFile = nextPreview.entryFile ?? preferredEntryFile ?? '';

      setPreviewState(nextPreview);
      if (nextEntryFile) {
        setEntryFilePathState(nextEntryFile);
      }
      setGeneratedCode(extractGeneratedCode(files, nextEntryFile || preferredEntryFile || 'index.html', nextPreview.html));

      if (nextPreview.canPreview && nextPreview.html) {
        setCurrentHtml(nextPreview.html);
        lastStablePreviewHtmlRef.current = nextPreview.html;
        setIsShowingPreviewFallback(false);
        return nextPreview;
      }

      if (options?.allowFallback && lastStablePreviewHtmlRef.current) {
        setCurrentHtml(lastStablePreviewHtmlRef.current);
        setIsShowingPreviewFallback(true);
      } else {
        setCurrentHtml(null);
        setIsShowingPreviewFallback(false);
        if (!options?.allowFallback) {
          lastStablePreviewHtmlRef.current = null;
        }
      }

      return nextPreview;
    },
    []
  );

  const applyProjectArtifact = useCallback(
    (
      artifact: MVPProjectArtifact,
      options?: {
        allowFallback?: boolean;
        setAsBaseline?: boolean;
        preserveProjectName?: boolean;
        preserveProjectType?: boolean;
      }
    ) => {
      const nextArtifact = normalizeSnapshotArtifact(artifact);

      setProjectFiles(nextArtifact.files);
      setProjectFramework(nextArtifact.framework);
      setProjectSummary(nextArtifact.summary);
      setProjectDependencies(nextArtifact.dependencies);
      setGeneratedCode(extractGeneratedCode(nextArtifact.files, nextArtifact.entryFile, null));
      setSelectedCodeFilePath((prev) => {
        if (prev && nextArtifact.files.some((file) => file.path === prev)) return prev;
        return nextArtifact.files[0]?.path ?? null;
      });

      if (!options?.preserveProjectName && nextArtifact.projectName.trim()) {
        setProjectNameState(nextArtifact.projectName);
      }
      if (!options?.preserveProjectType) {
        setSelectedProjectTypeState(nextArtifact.projectType);
      }

      if (options?.setAsBaseline) {
        setLastGeneratedProject(nextArtifact);
      }

      refreshPreview(nextArtifact.files, nextArtifact.entryFile, {
        allowFallback: options?.allowFallback,
      });
    },
    [refreshPreview]
  );

  const appendPromptHistory = useCallback((entry: MVPPromptHistoryItem) => {
    setPromptHistory((prev) => sortHistory([entry, ...prev]));
  }, []);

  const addProjectSnapshot = useCallback(
    (
      artifact: MVPProjectArtifact,
      label: string,
      source: MVPProjectSnapshot['source']
    ) => {
      const snapshot = createProjectSnapshot(artifact, label, source);
      setProjectSnapshots((prev) => mergeSnapshots(prev, snapshot));
      return snapshot;
    },
    []
  );

  const persist = useCallback(
    (
      msgs: MVPMessage[],
      html: string | null,
      code: string | null,
      project: MVPProjectArtifact | null,
      name: string,
      pid: string,
      savedAt: string | null,
      unsavedChanges: boolean,
      history: MVPPromptHistoryItem[],
      models: string[],
      projectType: MVPProjectType,
      snapshots: MVPProjectSnapshot[],
      repoSession: GitHubRepoSession | null,
      pendingChanges: GitHubFileChange[],
      commitHistory: GitHubCommitRecord[],
      prompt: string | null,
      commitMessage: string | null,
      codeFilePath: string | null,
      generatedProject: MVPProjectArtifact | null,
      setup: MVPBuilderSetupInput,
      versions: MVPBuilderVersion[],
      actionQuote: MVPActionQuote | null,
      deployUrl: string | null
    ) => {
      try {
        const session: PersistedSession = {
          messages: msgs.map((m) => ({ ...m, isStreaming: false })),
          currentHtml: html,
          generatedCode: code,
          currentProject: project,
          projectName: name,
          projectId: pid,
          lastSavedAt: savedAt,
          hasUnsavedChanges: unsavedChanges,
          promptHistory: history,
          selectedModels: models,
          selectedProjectType: projectType,
          projectSnapshots: snapshots,
          githubRepoSession: repoSession,
          githubPendingChanges: pendingChanges,
          githubCommitHistory: commitHistory,
          lastGitHubPrompt: prompt,
          suggestedGitHubCommitMessage: commitMessage,
          selectedCodeFilePath: codeFilePath,
          lastGeneratedProject: generatedProject,
          setupInput: setup,
          projectVersions: versions,
          lastActionQuote: actionQuote,
          deploymentUrl: deployUrl,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      } catch {
        // ignore storage errors
      }
    },
    []
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const session: PersistedSession = JSON.parse(raw);
      setMessages(
        (session.messages || []).map((message) => ({
          ...message,
          isStreaming: false,
        }))
      );
      setGeneratedCode(session.generatedCode ?? '');
      setProjectNameState(session.projectName ?? DEFAULT_PROJECT_NAME);
      if (session.projectId) setProjectId(session.projectId);
      setLastSavedAt(session.lastSavedAt ?? null);
      setHasUnsavedChanges(Boolean(session.hasUnsavedChanges));
      setPromptHistory(
        Array.isArray(session.promptHistory)
          ? sortHistory(
              session.promptHistory.filter(
                (item): item is MVPPromptHistoryItem =>
                  Boolean(
                    item &&
                      typeof item.id === 'string' &&
                      typeof item.prompt === 'string' &&
                      typeof item.committedAt === 'string'
                  )
              )
            )
          : []
      );
      setSelectedModelsState(sanitizeMVPModelSelection(session.selectedModels));
      setSelectedProjectTypeState(sanitizeMVPProjectType(session.selectedProjectType));
      setSetupInputState({
        ...createDefaultSetupInput(),
        ...(session.setupInput || {}),
        template: sanitizeMVPBuilderTemplate(session.setupInput?.template),
        palettePreference: sanitizeMVPBuilderPalette(session.setupInput?.palettePreference),
      });
      setProjectVersions(Array.isArray(session.projectVersions) ? session.projectVersions : []);
      setLastActionQuote(session.lastActionQuote ?? null);
      setDeploymentUrl(session.deploymentUrl ?? null);
      setGitHubRepoSession(session.githubRepoSession ?? null);
      setGitHubPendingChanges(Array.isArray(session.githubPendingChanges) ? session.githubPendingChanges : []);
      setGitHubCommitHistory(Array.isArray(session.githubCommitHistory) ? session.githubCommitHistory : []);
      setLastGitHubPrompt(session.lastGitHubPrompt ?? null);
      setSuggestedGitHubCommitMessage(session.suggestedGitHubCommitMessage ?? null);
      setSelectedCodeFilePath(session.selectedCodeFilePath ?? null);
      setProjectSnapshots(
        Array.isArray(session.projectSnapshots)
          ? session.projectSnapshots
              .map((snapshot) => {
                if (
                  !snapshot ||
                  typeof snapshot.id !== 'string' ||
                  typeof snapshot.label !== 'string' ||
                  typeof snapshot.createdAt !== 'string' ||
                  !snapshot.artifact
                ) {
                  return null;
                }

                return {
                  ...snapshot,
                  artifact: normalizeSnapshotArtifact(snapshot.artifact),
                } as MVPProjectSnapshot;
              })
              .filter((snapshot): snapshot is MVPProjectSnapshot => Boolean(snapshot))
          : []
      );

      const restoredProject =
        session.currentProject ??
        (session.currentHtml
          ? createProjectFromHtml(session.currentHtml, session.projectName ?? 'Generated App')
          : null);

      if (restoredProject) {
        applyProjectArtifact(restoredProject, {
          allowFallback: false,
          setAsBaseline: false,
          preserveProjectName: true,
          preserveProjectType: false,
        });
      } else {
        setProjectFiles([]);
        setProjectFramework('static-html');
        setCurrentHtml(null);
        setGeneratedCode('');
        setPreviewState({
          html: null,
          entryFile: null,
          canPreview: false,
          warnings: [],
          errors: [],
          runtimeMode: 'none',
          consoleHints: [],
        });
      }

      if (session.lastGeneratedProject) {
        setLastGeneratedProject({
          ...normalizeSnapshotArtifact(session.lastGeneratedProject),
        });
      }
    } catch {
      // ignore corrupt state
    }
  }, [applyProjectArtifact]);

  useEffect(() => {
    persist(
      messages,
      currentHtml,
      generatedCode,
      projectFiles.length > 0
        ? {
            projectName,
            framework: projectFramework,
            projectType: selectedProjectType,
            entryFile: entryFilePath,
            summary: projectSummary,
            dependencies: projectDependencies,
            files: projectFiles,
          }
        : null,
      projectName,
      projectId,
      lastSavedAt,
      hasUnsavedChanges,
      promptHistory,
      selectedModels,
      selectedProjectType,
      projectSnapshots,
      githubRepoSession,
      githubPendingChanges,
      githubCommitHistory,
      lastGitHubPrompt,
      suggestedGitHubCommitMessage,
      selectedCodeFilePath,
      lastGeneratedProject,
      setupInput,
      projectVersions,
      lastActionQuote,
      deploymentUrl
    );
  }, [
    messages,
    currentHtml,
    generatedCode,
    projectFiles,
    projectFramework,
    selectedProjectType,
    entryFilePath,
    projectSummary,
    projectDependencies,
    projectName,
    projectId,
    lastSavedAt,
    hasUnsavedChanges,
    promptHistory,
    selectedModels,
    projectSnapshots,
    githubRepoSession,
    githubPendingChanges,
    githubCommitHistory,
    lastGitHubPrompt,
    suggestedGitHubCommitMessage,
    selectedCodeFilePath,
    lastGeneratedProject,
    setupInput,
    projectVersions,
    lastActionQuote,
    deploymentUrl,
    persist,
  ]);

  const hydrateFromSavedProject = useCallback(
    (record: MVPProjectRecord) => {
      const restoredMessages = Array.isArray(record.prompt_history)
        ? record.prompt_history
            .map((message) => {
              if (
                !message ||
                (message.role !== 'user' && message.role !== 'assistant') ||
                typeof message.content !== 'string'
              ) {
                return null;
              }

              return {
                ...message,
                createdAt: message.createdAt ?? new Date().toISOString(),
                isStreaming: false,
                type: message.type === 'error' ? 'error' : 'message',
              } as MVPMessage;
            })
            .filter((message): message is MVPMessage => Boolean(message))
        : [];

      replaceMessages(restoredMessages);
      setProjectId(record.id);
      setProjectNameState(record.title || DEFAULT_PROJECT_NAME);
      setLastSavedAt(record.updated_at ?? record.created_at);
      setHasUnsavedChanges(false);
      setGeneratedCode(record.generated_code ?? '');
      setProjectVersions(Array.isArray(record.versions) ? record.versions : []);
      setDeploymentUrl(record.deployment_url ?? null);
      setProjectSnapshots([]);
      setSelectedModelsState([MVP_DEFAULT_MODEL]);
      setGitHubRepoSession(null);
      setGitHubPendingChanges([]);
      setGitHubCommitHistory([]);
      setLastGitHubPrompt(null);
      setSuggestedGitHubCommitMessage(null);
      setGitHubBranches([]);

      const recordFiles = Array.isArray(record.project_files)
        ? normalizeProjectFiles(
            record.project_files.map((file) => ({
              path: normalizeProjectPath(file.filename || file.path || 'index.html'),
              content: file.content,
              language: detectProjectFileLanguage(file.filename || file.path || 'index.html'),
            }))
          )
        : [];

      if (recordFiles.length > 0 || record.generated_code) {
        const artifact = recordFiles.length > 0
          ? {
              projectName: record.title || DEFAULT_PROJECT_NAME,
              framework: 'static-html' as const,
              projectType: 'landing-page' as const,
              entryFile: pickProjectEntryFile(recordFiles) ?? recordFiles[0]?.path ?? 'index.html',
              summary: 'Loaded from MVP Builder project storage.',
              dependencies: [],
              files: recordFiles,
            }
          : createProjectFromHtml(record.generated_code || '', record.title || DEFAULT_PROJECT_NAME);
        applyProjectArtifact(artifact, {
          allowFallback: false,
          setAsBaseline: true,
          preserveProjectName: true,
          preserveProjectType: false,
        });
      } else {
        setProjectFiles([]);
        setProjectFramework('static-html');
        setProjectSummary('Generated with MVP Builder.');
        setProjectDependencies([]);
        setCurrentHtml(null);
        setPreviewState({
          html: null,
          entryFile: null,
          canPreview: false,
          warnings: [],
          errors: [],
          runtimeMode: 'none',
          consoleHints: [],
        });
        setSelectedCodeFilePath(null);
        setLastGeneratedProject(null);
      }
    },
    [applyProjectArtifact, replaceMessages]
  );

  const loadProjects = useCallback(async () => {
    if (!user) {
      setSavedProjects([]);
      return;
    }

    setIsProjectsLoading(true);
    try {
      const { data, error } = await supabase
        .from(MVP_PROJECTS_TABLE as never)
        .select('id, title, prompt_history, generated_code, project_type, template, project_files, versions, deployment_url, deployment_slug, deployment_status, github_connection_id, supabase_connection_id, metadata, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setSavedProjects(
        Array.isArray(data)
          ? data.map((record) => ({
              id: String(record.id),
              title: typeof record.title === 'string' && record.title.trim() ? record.title.trim() : DEFAULT_PROJECT_NAME,
              prompt_history: Array.isArray(record.prompt_history) ? (record.prompt_history as MVPMessage[]) : [],
              generated_code: typeof record.generated_code === 'string' ? record.generated_code : null,
              project_type: record.project_type === 'react_multi' ? 'react_multi' : 'html_single',
              template: sanitizeMVPBuilderTemplate(record.template),
              project_files: Array.isArray(record.project_files) ? record.project_files as MVPProjectRecord['project_files'] : [],
              versions: Array.isArray(record.versions) ? record.versions as MVPBuilderVersion[] : [],
              deployment_url: typeof record.deployment_url === 'string' ? record.deployment_url : null,
              deployment_slug: typeof record.deployment_slug === 'string' ? record.deployment_slug : null,
              deployment_status: record.deployment_status as MVPProjectRecord['deployment_status'],
              github_connection_id: typeof record.github_connection_id === 'string' ? record.github_connection_id : null,
              supabase_connection_id: typeof record.supabase_connection_id === 'string' ? record.supabase_connection_id : null,
              metadata: record.metadata && typeof record.metadata === 'object' ? record.metadata as Record<string, unknown> : {},
              created_at: typeof record.created_at === 'string' ? record.created_at : new Date().toISOString(),
              updated_at:
                typeof record.updated_at === 'string'
                  ? record.updated_at
                  : typeof record.created_at === 'string'
                  ? record.created_at
                  : new Date().toISOString(),
            }))
          : []
      );
    } catch (error) {
      console.error('Failed to load MVP projects:', error);
    } finally {
      setIsProjectsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fillFromContext = async () => {
      if (
        setupInput.productName ||
        setupInput.oneLineDescription ||
        setupInput.validatedProblemStatement ||
        setupInput.prefillSource
      ) {
        return;
      }

      try {
        const [
          profileResult,
          waitlistRow,
          latestIcp,
          pmfRow,
          techStackRow,
          legacyMvpRow,
          gtmRow,
        ] = await Promise.all([
          supabase
            .from('profiles' as never)
            .select(
              [
                'id',
                'startup_name',
                'startup_industry',
                'country',
                'startup_description',
                'startup_tagline',
                'startup_stage',
                'business_stage',
                'website_url',
                'positioning_line',
                'startup_links',
                'user_preferences',
                'primary_icp_analysis_id',
                'quiz_current_stage',
                'quiz_biggest_challenge',
                'quiz_answers_v2',
                'assigned_stage',
                'current_focus',
                'updated_at',
              ].join(', ')
            )
            .eq('id', user.id)
            .maybeSingle(),
          fetchLatestContextRow(
            'waitlist_pages',
            user.id,
            'id, title, value_proposition, target_audience, metadata, status, published_at, exported_at, created_at, updated_at'
          ),
          fetchLatestContextRow(
            'icp_analysis_results',
            user.id,
            'id, analysis_data, target_audience, business_description, verdict, industry, niche_score, created_at, updated_at',
            'updated_at'
          ),
          fetchLatestContextRow(
            'pmf_analysis_results',
            user.id,
            'id, analysis_data, pmf_score, verdict, target_market, industry, created_at, updated_at, saved_at',
            'created_at'
          ).catch(() => null),
          fetchLatestContextRow(
            'tech_stack_reports',
            user.id,
            'id, name, selected_products, budget_total, budget_breakdown, has_variable, created_at, updated_at',
            'updated_at'
          ),
          fetchLatestContextRow(
            'mvp_builder_artifacts',
            user.id,
            'id, scope_title, scope_summary, status, saved_at, created_at, updated_at',
            'updated_at'
          ),
          fetchLatestContextRow(
            'gtm_plans',
            user.id,
            'id, plan_title, plan_content, status, saved_at, exported_at, created_at, updated_at',
            'updated_at'
          ),
        ]);

        if (profileResult.error) throw profileResult.error;
        if (cancelled) return;

        const profile = profileResult.data as ProfilePrefillRow | null;
        const waitlist = waitlistRow as WaitlistPrefillRow | null;
        const primaryIcpId = asText(profile?.primary_icp_analysis_id);
        const primaryIcp = primaryIcpId
          ? await fetchContextRowById(
              'icp_analysis_results',
              user.id,
              primaryIcpId,
              'id, analysis_data, target_audience, business_description, verdict, industry, niche_score, created_at, updated_at',
            ).catch(() => latestIcp)
          : latestIcp;
        const dashboardModel = buildStartupCommandCenterModel({
          profile: profile as Record<string, unknown> | null,
          icpRow: primaryIcp ?? latestIcp,
          pmfRow,
          techStackRow,
          waitlistRow,
          mvpRow: legacyMvpRow,
          gtmRow,
        });
        const icp = primaryIcp as ICPPrefillRow | null;
        const prefill = buildMVPSetupPrefill({
          profile,
          waitlist,
          icp,
          dashboardModel,
        });
        const nextStartupContext = buildMVPStartupContext({
          profile,
          waitlist,
          icp,
          dashboardModel,
          source: prefill.prefillSource ?? null,
        });

        setStartupContext(nextStartupContext);
        if (!prefill.prefillSource) return;

        setSetupInputState((prev) => ({
          ...prev,
          productName: prev.productName || prefill.productName || '',
          oneLineDescription: prev.oneLineDescription || prefill.oneLineDescription || '',
          validatedProblemStatement: prev.validatedProblemStatement || prefill.validatedProblemStatement || '',
          validatedTargetSegment: prev.validatedTargetSegment || prefill.validatedTargetSegment || '',
          keyPainLanguage: prev.keyPainLanguage || prefill.keyPainLanguage || '',
          existingTagline: prev.existingTagline || prefill.existingTagline || '',
          prefillSource: prev.prefillSource || prefill.prefillSource || null,
        }));
      } catch {
        // Context prefill is opportunistic; the builder still works without it.
      }
    };

    void fillFromContext();
    return () => {
      cancelled = true;
    };
  }, [
    setupInput.oneLineDescription,
    setupInput.prefillSource,
    setupInput.productName,
    setupInput.validatedProblemStatement,
    user,
  ]);

  const saveProject = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!user) return false;

      const codeToSave =
        generatedCode ||
        currentHtml ||
        extractGeneratedCode(projectFiles, entryFilePath, currentHtml) ||
        null;
      const timestamp = new Date().toISOString();
      const payload = {
        id: projectId,
        user_id: user.id,
        title: projectName.trim() || DEFAULT_PROJECT_NAME,
        prompt_history: messages.map((message) => ({
          ...message,
          isStreaming: false,
        })),
        generated_code: codeToSave,
        project_type: projectFramework === 'react-vite' ? 'react_vite' : 'html_single',
        template: setupInput.template,
        project_files: projectFiles.map((file) => ({
          filename: file.path,
          content: file.content,
          description: file.path === entryFilePath ? 'Primary preview file.' : `Project file ${file.path}.`,
        })),
        versions: projectVersions,
        deployment_url: deploymentUrl,
        deployment_status: deploymentUrl ? 'deployed' : 'not_deployed',
        github_connection_id: githubConnection.connectionId ?? null,
        supabase_connection_id: supabaseConnection.connectionId ?? null,
        metadata: {
          setupInput,
          phase: 'mvp_builder_phase2',
          framework: projectFramework,
          buildCommand: projectFramework === 'react-vite' ? 'npm run build' : '',
          devCommand: projectFramework === 'react-vite' ? 'npm run dev' : '',
          integrations: {
            github: {
              connectionId: githubConnection.connectionId ?? null,
              repository: githubRepoSession
                ? {
                    fullName: githubRepoSession.fullName,
                    branch: 'main',
                    htmlUrl: githubRepoSession.htmlUrl ?? null,
                    baseCommitSha: githubRepoSession.baseCommitSha,
                  }
                : githubConnection.repository ?? null,
              status: githubConnection.status ?? 'disconnected',
            },
            supabase: {
              connectionId: supabaseConnection.connectionId ?? null,
              project: supabaseConnection.project,
              status: supabaseConnection.status,
            },
          },
        },
        updated_at: timestamp,
      };

      setIsSavingProject(true);
      try {
        const { data, error } = await supabase
          .from(MVP_PROJECTS_TABLE as never)
          .upsert(payload)
          .select('id, title, prompt_history, generated_code, project_type, template, project_files, versions, deployment_url, deployment_slug, deployment_status, github_connection_id, supabase_connection_id, metadata, created_at, updated_at')
          .single();

        if (error) throw error;

        const savedRecord: MVPProjectRecord = {
          id: String(data.id),
          title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : DEFAULT_PROJECT_NAME,
          prompt_history: Array.isArray(data.prompt_history) ? (data.prompt_history as MVPMessage[]) : payload.prompt_history,
          generated_code: typeof data.generated_code === 'string' ? data.generated_code : codeToSave,
          project_type: data.project_type === 'react_multi' ? 'react_multi' : 'html_single',
          template: sanitizeMVPBuilderTemplate(data.template),
          project_files: Array.isArray(data.project_files) ? data.project_files as MVPProjectRecord['project_files'] : payload.project_files,
          versions: Array.isArray(data.versions) ? data.versions as MVPBuilderVersion[] : projectVersions,
          deployment_url: typeof data.deployment_url === 'string' ? data.deployment_url : deploymentUrl,
          deployment_slug: typeof data.deployment_slug === 'string' ? data.deployment_slug : null,
          deployment_status: data.deployment_status as MVPProjectRecord['deployment_status'],
          github_connection_id: typeof data.github_connection_id === 'string' ? data.github_connection_id : null,
          supabase_connection_id: typeof data.supabase_connection_id === 'string' ? data.supabase_connection_id : null,
          metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata as Record<string, unknown> : payload.metadata,
          created_at: typeof data.created_at === 'string' ? data.created_at : timestamp,
          updated_at: typeof data.updated_at === 'string' ? data.updated_at : timestamp,
        };

        setProjectId(savedRecord.id);
        setLastSavedAt(savedRecord.updated_at);
        setHasUnsavedChanges(false);
        setSavedProjects((prev) =>
          [savedRecord, ...prev.filter((project) => project.id !== savedRecord.id)].sort(
            (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
          )
        );

        if (!options?.silent) {
          toast.success('Project saved.');
        }
        return true;
      } catch (error) {
        console.error('Failed to save MVP project:', error);
        if (!options?.silent) {
          toast.error('Unable to save this project right now.');
        }
        return false;
      } finally {
        setIsSavingProject(false);
      }
    },
    [currentHtml, deploymentUrl, entryFilePath, generatedCode, githubConnection, githubRepoSession, messages, projectFiles, projectFramework, projectId, projectName, projectVersions, setupInput, supabaseConnection, user]
  );

  const loadProject = useCallback(
    async (id: string) => {
      if (!user || !id) return;

      try {
        let project = savedProjects.find((item) => item.id === id) ?? null;
        if (!project) {
          const { data, error } = await supabase
            .from(MVP_PROJECTS_TABLE as never)
            .select('id, title, prompt_history, generated_code, project_type, template, project_files, versions, deployment_url, deployment_slug, deployment_status, github_connection_id, supabase_connection_id, metadata, created_at, updated_at')
            .eq('id', id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) throw error;
          if (!data) return;

          project = {
            id: String(data.id),
            title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : DEFAULT_PROJECT_NAME,
            prompt_history: Array.isArray(data.prompt_history) ? (data.prompt_history as MVPMessage[]) : [],
            generated_code: typeof data.generated_code === 'string' ? data.generated_code : null,
            project_type: data.project_type === 'react_multi' ? 'react_multi' : 'html_single',
            template: sanitizeMVPBuilderTemplate(data.template),
            project_files: Array.isArray(data.project_files) ? data.project_files as MVPProjectRecord['project_files'] : [],
            versions: Array.isArray(data.versions) ? data.versions as MVPBuilderVersion[] : [],
            deployment_url: typeof data.deployment_url === 'string' ? data.deployment_url : null,
            deployment_slug: typeof data.deployment_slug === 'string' ? data.deployment_slug : null,
            deployment_status: data.deployment_status as MVPProjectRecord['deployment_status'],
            github_connection_id: typeof data.github_connection_id === 'string' ? data.github_connection_id : null,
            supabase_connection_id: typeof data.supabase_connection_id === 'string' ? data.supabase_connection_id : null,
            metadata: data.metadata && typeof data.metadata === 'object' ? data.metadata as Record<string, unknown> : {},
            created_at: typeof data.created_at === 'string' ? data.created_at : new Date().toISOString(),
            updated_at:
              typeof data.updated_at === 'string'
                ? data.updated_at
                : typeof data.created_at === 'string'
                ? data.created_at
                : new Date().toISOString(),
          };
        }

        hydrateFromSavedProject(project);
        toast.success(`Loaded ${project.title}.`);
      } catch (error) {
        console.error('Failed to load MVP project:', error);
        toast.error('Unable to load this project right now.');
      }
    },
    [hydrateFromSavedProject, savedProjects, user]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      if (!user || !id) return false;

      try {
        const { error } = await supabase
          .from(MVP_PROJECTS_TABLE as never)
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) throw error;

        setSavedProjects((prev) => prev.filter((project) => project.id !== id));
        if (projectId === id) {
          setLastSavedAt(null);
          setHasUnsavedChanges(false);
        }
        toast.success('Project deleted.');
        return true;
      } catch (error) {
        console.error('Failed to delete MVP project:', error);
        toast.error('Unable to delete this project right now.');
        return false;
      }
    },
    [projectId, user]
  );

  useEffect(() => {
    if (!user) return;

    const intervalId = window.setInterval(() => {
      if (!hasUnsavedChanges || isSavingProject) return;
      void saveProject({ silent: true });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [hasUnsavedChanges, isSavingProject, saveProject, user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('github_connected') === '1') {
      toast.success('GitHub connected successfully.');
      params.delete('github_connected');
      const query = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
      );
    } else if (params.get('supabase_connected') === '1') {
      toast.success('Supabase connected successfully.');
      params.delete('supabase_connected');
      const query = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
      );
    } else if (params.get('github_error')) {
      toast.error(params.get('github_error') || 'Failed to connect GitHub.');
      params.delete('github_error');
      const query = params.toString();
      window.history.replaceState(
        {},
        '',
        `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
      );
    }
  }, []);

  const callGitHubFunction = useCallback(
    async <T>(action: string, payload: Record<string, unknown> = {}): Promise<T> => {
      const accessToken = await getAccessTokenSafely();
      if (!accessToken) {
        throw new Error('Please sign in first.');
      }

      const response = await fetch(GITHUB_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action, ...payload }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(
          typeof json?.error === 'string' ? json.error : `HTTP ${response.status}`
        ) as FunctionError;
        err.status = response.status;
        throw err;
      }

      return json as T;
    },
    []
  );

  const refreshGitHubConnection = useCallback(async () => {
    if (!user) {
      setGitHubConnection({ connected: false, status: 'disconnected', profile: null, repository: null });
      return;
    }
    try {
      const result = await callGitHubFunction<{
        connected: boolean;
        status?: MVPIntegrationStatus;
        lastError?: string | null;
        expiresAt?: string | null;
        connectionId?: string;
        profile: GitHubConnectionState['profile'];
        repository?: GitHubConnectionState['repository'];
      }>('get_connection');
      const status = classifyIntegrationStatus({
        connected: Boolean(result.connected),
        status: result.status,
        lastError: result.lastError,
        expiresAt: result.expiresAt,
      });
      setGitHubConnection({
        connected: Boolean(result.connected) && status === 'connected',
        status,
        lastError: result.lastError ?? null,
        expiresAt: result.expiresAt ?? null,
        connectionId: result.connectionId,
        profile: result.profile ?? null,
        repository: result.repository ?? null,
      });
    } catch {
      setGitHubConnection({ connected: false, status: 'error', profile: null, repository: null, lastError: 'Unable to verify GitHub connection.' });
    }
  }, [callGitHubFunction, user]);

  useEffect(() => {
    void refreshGitHubConnection();
  }, [refreshGitHubConnection]);

  const connectGitHub = useCallback(async () => {
    if (!user) {
      toast.error('Please sign in to connect GitHub.');
      return;
    }
    setIsGitHubBusy(true);
    try {
      const result = await callGitHubFunction<{ authorizeUrl: string }>('oauth_init', {
        redirectTo: `${window.location.origin}/mvp-builder`,
        projectId,
      });
      if (!result.authorizeUrl) {
        throw new Error('Failed to initialize GitHub OAuth.');
      }
      window.location.href = result.authorizeUrl;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to connect GitHub.'
      );
    } finally {
      setIsGitHubBusy(false);
    }
  }, [callGitHubFunction, projectId, user]);

  const disconnectGitHub = useCallback(async () => {
    setIsGitHubBusy(true);
    try {
      await callGitHubFunction('disconnect');
      setGitHubConnection({ connected: false, status: 'disconnected', profile: null, repository: null });
      setGitHubRepositories([]);
      setGitHubBranches([]);
      setGitHubRepoSession(null);
      setGitHubPendingChanges([]);
      setGitHubCommitHistory([]);
      toast.success('GitHub disconnected.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to disconnect GitHub.'
      );
    } finally {
      setIsGitHubBusy(false);
    }
  }, [callGitHubFunction]);

  const callSupabaseIntegrationFunction = useCallback(
    async <T>(action: string, payload: Record<string, unknown> = {}): Promise<T> => {
      const accessToken = await getAccessTokenSafely();
      if (!accessToken) {
        throw new Error('Please sign in first.');
      }

      const response = await fetch(SUPABASE_INTEGRATION_FN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action, ...payload }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        const err = new Error(
          typeof json?.error === 'string' ? json.error : `HTTP ${response.status}`
        ) as FunctionError;
        err.status = response.status;
        throw err;
      }

      return json as T;
    },
    []
  );

  const refreshSupabaseConnection = useCallback(async () => {
    if (!user) {
      setSupabaseConnection({ connected: false, status: 'disconnected', project: null });
      return;
    }
    try {
      const result = await callSupabaseIntegrationFunction<SupabaseConnectionState>('get_connection');
      const status = classifyIntegrationStatus({
        connected: Boolean(result.connected),
        status: result.status,
        lastError: result.lastError,
        expiresAt: result.expiresAt,
      });
      setSupabaseConnection({
        ...result,
        connected: Boolean(result.connected) && status === 'connected',
        status,
        project: result.project ?? null,
      });
    } catch {
      setSupabaseConnection({
        connected: false,
        status: 'error',
        project: null,
        lastError: 'Unable to verify Supabase connection.',
      });
    }
  }, [callSupabaseIntegrationFunction, user]);

  useEffect(() => {
    void refreshSupabaseConnection();
  }, [refreshSupabaseConnection]);

  const saveSupabaseCredentials = useCallback(async (projectUrl: string, serviceRoleKey: string) => {
    if (!user) {
      toast.error('Please sign in to connect Supabase.');
      return;
    }
    setIsSupabaseBusy(true);
    try {
      const result = await callSupabaseIntegrationFunction<SupabaseConnectionState>('save_credentials', {
        projectUrl,
        serviceRoleKey,
      });
      const status = classifyIntegrationStatus({
        connected: Boolean(result.connected),
        status: result.status,
        lastError: result.lastError,
        expiresAt: null,
      });
      setSupabaseConnection({
        ...result,
        connected: Boolean(result.connected) && status === 'connected',
        status,
        project: result.project ?? null,
      });
      toast.success('Supabase project connected.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to connect Supabase.');
    } finally {
      setIsSupabaseBusy(false);
    }
  }, [callSupabaseIntegrationFunction, user]);

  const disconnectSupabaseProject = useCallback(async () => {
    setIsSupabaseBusy(true);
    try {
      await callSupabaseIntegrationFunction('disconnect');
      setSupabaseConnection({ connected: false, status: 'disconnected', project: null });
      setSupabaseProjects([]);
      setSupabaseBackendSnapshot(null);
      toast.success('Supabase disconnected.');
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to disconnect Supabase.'
      );
    } finally {
      setIsSupabaseBusy(false);
    }
  }, [callSupabaseIntegrationFunction]);

  const loadSupabaseProjects = useCallback(async () => {
    setIsSupabaseBusy(true);
    try {
      const result = await callSupabaseIntegrationFunction<{
        projects: Array<Record<string, unknown>>;
      }>('list_projects');
      setSupabaseProjects(
        (result.projects || []).map((project) => ({
          id: typeof project.id === 'string' ? project.id : undefined,
          ref: String(project.ref || project.id || ''),
          name: String(project.name || project.ref || project.id || 'Untitled project'),
          region: typeof project.region === 'string' ? project.region : null,
          status: typeof project.status === 'string' ? project.status : null,
          organizationId:
            typeof project.organization_id === 'string'
              ? project.organization_id
              : typeof (project.organization as { id?: unknown } | undefined)?.id === 'string'
              ? String((project.organization as { id?: unknown }).id)
              : null,
          organizationName:
            typeof project.organization_name === 'string'
              ? project.organization_name
              : typeof (project.organization as { name?: unknown } | undefined)?.name === 'string'
              ? String((project.organization as { name?: unknown }).name)
              : null,
        })).filter((project) => project.ref)
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load Supabase projects.'
      );
    } finally {
      setIsSupabaseBusy(false);
    }
  }, [callSupabaseIntegrationFunction]);

  const selectSupabaseProject = useCallback(async (projectRef: string) => {
    if (!projectRef) return;
    setIsSupabaseBusy(true);
    try {
      const result = await callSupabaseIntegrationFunction<{ project: Record<string, unknown> }>('select_project', {
        projectRef,
      });
      const project = result.project || {};
      setSupabaseConnection((prev) => ({
        ...prev,
        connected: true,
        status: 'connected',
        lastError: null,
        project: {
          ref: projectRef,
          name: String(project.name || projectRef),
          region: typeof project.region === 'string' ? project.region : null,
          status: typeof project.status === 'string' ? project.status : null,
          organizationId: typeof project.organization_id === 'string' ? project.organization_id : null,
          organizationName: typeof project.organization_name === 'string' ? project.organization_name : null,
        },
      }));
      toast.success('Supabase project linked.');
      void refreshSupabaseConnection();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to link Supabase project.'
      );
    } finally {
      setIsSupabaseBusy(false);
    }
  }, [callSupabaseIntegrationFunction, refreshSupabaseConnection]);

  const loadSupabaseBackendSnapshot = useCallback(async () => {
    if (!supabaseConnection.project?.ref) return;
    setIsSupabaseBusy(true);
    try {
      const result = await callSupabaseIntegrationFunction<Record<string, unknown>>('backend_snapshot', {
        projectRef: supabaseConnection.project.ref,
      });
      setSupabaseBackendSnapshot(result);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load Supabase backend status.'
      );
    } finally {
      setIsSupabaseBusy(false);
    }
  }, [callSupabaseIntegrationFunction, supabaseConnection.project?.ref]);

  const loadGitHubRepositories = useCallback(async () => {
    setIsGitHubBusy(true);
    try {
      const result = await callGitHubFunction<{
        repositories: Array<{
          id: string | number;
          name: string;
          full_name: string;
          private: boolean;
          default_branch: string;
          html_url?: string | null;
          updated_at?: string;
        }>;
      }>('list_repos');

      setGitHubRepositories(
        (result.repositories || []).map((repo) => ({
          id: String(repo.id),
          name: repo.name,
          fullName: repo.full_name,
          private: Boolean(repo.private),
          defaultBranch: repo.default_branch || 'main',
          htmlUrl: repo.html_url ?? null,
          updatedAt: repo.updated_at,
        }))
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to load repositories.'
      );
    } finally {
      setIsGitHubBusy(false);
    }
  }, [callGitHubFunction]);

  const loadGitHubBranches = useCallback(
    async (fullName: string) => {
      if (!fullName) return;
      setIsGitHubBusy(true);
      try {
        const result = await callGitHubFunction<{
          branches: Array<{ name: string }>;
        }>('list_branches', { fullName });
        setGitHubBranches(
          (result.branches || []).map((branch) => branch.name).filter(Boolean)
        );
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to load branches.'
        );
      } finally {
        setIsGitHubBusy(false);
      }
    },
    [callGitHubFunction]
  );

  const loadGitHubCommitHistory = useCallback(
    async (fullName?: string, branch?: string) => {
      const repo = fullName ?? githubRepoSession?.fullName;
      const targetBranch = branch ?? githubRepoSession?.branch;
      if (!repo || !targetBranch) return;

      try {
        const result = await callGitHubFunction<{
          commits: Array<{
            sha: string;
            shortSha: string;
            message: string;
            committedAt: string | null;
            url?: string | null;
            author?: string | null;
          }>;
        }>('list_commits', {
          fullName: repo,
          branch: targetBranch,
          perPage: 30,
        });
        setGitHubCommitHistory(result.commits || []);
      } catch {
        // non-blocking
      }
    },
    [callGitHubFunction, githubRepoSession?.branch, githubRepoSession?.fullName]
  );

  const importGitHubRepository = useCallback(
    async (fullName: string, branch?: string) => {
      if (!fullName) return;
      setIsGitHubBusy(true);
      try {
        const result = await callGitHubFunction<{
          repository: {
            owner: string;
            name: string;
            fullName: string;
            defaultBranch: string;
            htmlUrl?: string | null;
          };
          branch: string;
          baseCommitSha: string;
          files: GitHubRepoFile[];
        }>('import_repo', {
          fullName,
          branch: 'main',
        });

        const session: GitHubRepoSession = {
          owner: result.repository.owner,
          name: result.repository.name,
          fullName: result.repository.fullName,
          branch: result.branch,
          defaultBranch: result.repository.defaultBranch,
          baseCommitSha: result.baseCommitSha,
          htmlUrl: result.repository.htmlUrl ?? null,
          files: result.files || [],
          importedAt: new Date().toISOString(),
        };

        setGitHubRepoSession(session);
        setGitHubConnection((prev) => ({
          ...prev,
          connected: true,
          status: 'connected',
          lastError: null,
          repository: {
            fullName: session.fullName,
            htmlUrl: session.htmlUrl ?? null,
            branch: 'main',
            defaultBranch: session.defaultBranch,
            baseCommitSha: session.baseCommitSha,
          },
        }));
        setGitHubPendingChanges([]);
        setSuggestedGitHubCommitMessage(null);
        setLastGitHubPrompt(null);
        applyProjectArtifact(
          createProjectArtifactFromRepo(result.repository.name, session.files),
          {
            allowFallback: false,
            setAsBaseline: true,
            preserveProjectName: false,
          }
        );
        addProjectSnapshot(
          createProjectArtifactFromRepo(result.repository.name, session.files),
          `Imported ${result.repository.name}`,
          'imported'
        );

        await loadGitHubCommitHistory(session.fullName, session.branch);
        toast.success(`Imported ${session.fullName} (main)`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to import repository.'
        );
      } finally {
        setIsGitHubBusy(false);
      }
    },
    [addProjectSnapshot, applyProjectArtifact, callGitHubFunction, loadGitHubCommitHistory]
  );

  const discardGitHubChanges = useCallback(() => {
    setGitHubPendingChanges([]);
    setSuggestedGitHubCommitMessage(null);
    if (githubRepoSession) {
      applyProjectArtifact(
        createProjectArtifactFromRepo(githubRepoSession.name, githubRepoSession.files, entryFilePath),
        {
          allowFallback: false,
          setAsBaseline: true,
          preserveProjectName: true,
        }
      );
    }
  }, [applyProjectArtifact, entryFilePath, githubRepoSession]);

  const commitGitHubChanges = useCallback(
    async (options?: {
      createPullRequest?: boolean;
      targetBranch?: string;
      prTitle?: string;
      prBody?: string;
      commitMessage?: string;
    }) => {
      if (!githubRepoSession) {
        toast.error('Import a repository first.');
        return null;
      }
      if (githubPendingChanges.length === 0) {
        toast.error('No pending changes to commit.');
        return null;
      }

      setIsGitHubBusy(true);
      try {
        const result = await callGitHubFunction<{
          branch: string;
          commit: {
            sha: string;
            shortSha: string;
            message: string;
            url: string;
            committedAt: string;
          };
          pullRequest?: { number: number; html_url: string; title: string } | null;
        }>('commit_changes', {
          fullName: githubRepoSession.fullName,
          baseBranch: 'main',
          targetBranch: 'main',
          createPullRequest: false,
          prTitle: options?.prTitle,
          prBody: options?.prBody,
          prompt: lastGitHubPrompt,
          commitMessage:
            options?.commitMessage ||
            suggestedGitHubCommitMessage ||
            lastGitHubPrompt ||
            undefined,
          changes: githubPendingChanges,
        });

        const updatedFiles = applyChangesToFiles(
          githubRepoSession.files,
          githubPendingChanges
        );

        setGitHubRepoSession((prev) =>
          prev
            ? {
                ...prev,
                branch: result.branch || prev.branch,
                baseCommitSha: result.commit.sha,
                files: updatedFiles,
                importedAt: new Date().toISOString(),
              }
            : prev
        );
        setGitHubPendingChanges([]);
        setSuggestedGitHubCommitMessage(null);
        applyProjectArtifact(
          createProjectArtifactFromRepo(githubRepoSession.name, updatedFiles, entryFilePath),
          {
            allowFallback: false,
            setAsBaseline: true,
            preserveProjectName: true,
          }
        );
        addProjectSnapshot(
          createProjectArtifactFromRepo(githubRepoSession.name, updatedFiles, entryFilePath),
          result.pullRequest?.html_url ? 'Committed PR-ready changes' : 'Committed GitHub changes',
          'commit'
        );
        appendPromptHistory({
          id: crypto.randomUUID(),
          prompt: lastGitHubPrompt || result.commit.message,
          committedAt: result.commit.committedAt || new Date().toISOString(),
          commitRef: result.commit.shortSha || shortSha(result.commit.sha),
          commitUrl: result.commit.url,
          pullRequestUrl: result.pullRequest?.html_url,
          branch: result.branch,
        });
        await loadGitHubCommitHistory(
          githubRepoSession.fullName,
          result.branch || githubRepoSession.branch
        );
        toast.success(
          result.pullRequest?.html_url
            ? 'Changes committed and PR created.'
            : 'Changes committed to GitHub.'
        );
        return result;
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to commit changes.'
        );
        return null;
      } finally {
        setIsGitHubBusy(false);
      }
    },
    [
      appendPromptHistory,
      addProjectSnapshot,
      applyProjectArtifact,
      callGitHubFunction,
      entryFilePath,
      githubPendingChanges,
      githubRepoSession,
      lastGitHubPrompt,
      loadGitHubCommitHistory,
      suggestedGitHubCommitMessage,
    ]
  );

  const rollbackGitHubCommit = useCallback(
    async (targetCommitSha: string) => {
      if (!githubRepoSession || !targetCommitSha) return;
      setIsGitHubBusy(true);
      try {
        const result = await callGitHubFunction<{
          branch: string;
          commit: {
            sha: string;
            shortSha: string;
            message: string;
            url: string;
            committedAt: string;
          };
        }>('rollback_to_commit', {
          fullName: githubRepoSession.fullName,
          branch: githubRepoSession.branch,
          targetCommitSha,
        });

        appendPromptHistory({
          id: crypto.randomUUID(),
          prompt: `Rollback to ${shortSha(targetCommitSha)}`,
          committedAt: result.commit.committedAt || new Date().toISOString(),
          commitRef: result.commit.shortSha || shortSha(result.commit.sha),
          commitUrl: result.commit.url,
          branch: result.branch,
        });

        await importGitHubRepository(githubRepoSession.fullName, result.branch);
        toast.success(`Rolled back to ${shortSha(targetCommitSha)}.`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to rollback commit.'
        );
      } finally {
        setIsGitHubBusy(false);
      }
    },
    [appendPromptHistory, callGitHubFunction, githubRepoSession, importGitHubRepository]
  );

  const handleGitHubPrompt = useCallback(
    async (prompt: string, creditFeature: CreditFeature) => {
      if (!githubRepoSession) return;

      const userMsg = createMessage('user', prompt);
      const assistantMsg = createMessage('assistant', '', {
        isStreaming: true,
        linkedPrompt: prompt,
      });

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsGenerating(true);
      setLastGitHubPrompt(prompt);
      markProjectDirty();

      try {
        const result = await callGitHubFunction<{
          summary: string;
          commitMessage?: string;
          model?: string;
          changes: GitHubFileChange[];
          creditsUsed?: number;
        }>('ai_edit', {
          prompt,
          repositoryName: githubRepoSession.fullName,
          files: githubRepoSession.files,
          selectedModels,
        });

        const summary = result.summary || 'Prepared repository changes.';
        const changeCount = (result.changes || []).length;
        const changedPaths = (result.changes || [])
          .slice(0, 8)
          .map((change) => `- ${change.action.toUpperCase()} ${change.path}`)
          .join('\n');
        const assistantContent =
          changeCount > 0
            ? `${summary}\n\nChanged files (${changeCount}):\n${changedPaths}`
            : `${summary}\n\nNo file changes were suggested.`;

        setGitHubPendingChanges(result.changes || []);
        setSuggestedGitHubCommitMessage(result.commitMessage ?? null);
        void refreshCredits();
        const stagedFiles = applyChangesToFiles(
          githubRepoSession.files,
          result.changes || []
        );
        applyProjectArtifact(
          createProjectArtifactFromRepo(githubRepoSession.name, stagedFiles, entryFilePath),
          {
            allowFallback: true,
            setAsBaseline: false,
            preserveProjectName: true,
          }
        );

        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMsg.id
              ? {
                  ...message,
                  content: assistantContent,
                  isStreaming: false,
                  linkedPrompt: prompt,
                  model: result.model,
                }
              : message
          )
        );
      } catch (error) {
        const err = error as FunctionError;
        if (err.status === 402) {
          handleCreditError(
            { message: err.message, status: 402 },
            { error: err.message, errorCode: 'INSUFFICIENT_CREDITS' },
            creditFeature
          );
        } else {
          toast.error(err.message || 'Failed to generate repository changes.');
        }
        setMessages((prev) =>
          prev.map((message) =>
                message.id === assistantMsg.id
                  ? {
                      ...message,
                      content: err.message || 'Failed to generate repository changes.',
                      isStreaming: false,
                      type: 'error',
                      retryPrompt: prompt,
                    }
                  : message
              )
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [applyProjectArtifact, callGitHubFunction, entryFilePath, githubRepoSession, handleCreditError, markProjectDirty, refreshCredits, selectedModels]
  );

  const classifyActionQuote = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      setLastActionQuote(null);
      return null;
    }

    const localActionType = classifyMVPBuilderAction(prompt, projectFiles.length > 0);
    if (localActionType === 'unclear' || localActionType === 'unsupported') {
      const quote: MVPActionQuote = {
        actionType: localActionType,
        creditFeature: null,
        creditCost: 0,
      };
      setLastActionQuote(quote);
      return quote;
    }

    const localFeature = MVP_BUILDER_ACTION_CREDIT_FEATURE[localActionType] as CreditFeature;
    const fallbackQuote: MVPActionQuote = {
      actionType: localActionType,
      creditFeature: localFeature,
      creditCost: CREDIT_COSTS[localFeature] ?? 0,
    };
    setLastActionQuote(fallbackQuote);

    try {
      const response = await fetch(STREAM_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'classify',
          userMessage: prompt,
          currentProject:
            projectFiles.length > 0
              ? { files: projectFiles.map((file) => ({ path: file.path, content: file.content })) }
              : null,
        }),
      });
      if (!response.ok) return fallbackQuote;
      const data = await response.json();
      const quote: MVPActionQuote = {
        actionType: data.actionType || localActionType,
        creditFeature: data.creditFeature || localFeature,
        creditCost: typeof data.creditCost === 'number' ? data.creditCost : fallbackQuote.creditCost,
      };
      setLastActionQuote(quote);
      return quote;
    } catch {
      return fallbackQuote;
    }
  }, [projectFiles]);

  const sendMessage = useCallback(
    async (
      prompt: string,
      options?: {
        responseMode?: MVPBuilderResponseMode;
      }
    ) => {
      if (!prompt.trim() || isGenerating || isGitHubBusy) return;
      const responseMode = options?.responseMode ?? 'build';
      const localActionType =
        responseMode === 'chat'
          ? 'chat'
          : classifyMVPBuilderAction(prompt, projectFiles.length > 0);
      if (localActionType === 'unclear') {
        toast.info('Tell MVP Builder what you want to generate or change first.');
        return;
      }
      if (localActionType === 'unsupported') {
        toast.info('That request needs backend/auth/payment support planned for a later phase. Phase 2 supports frontend app generation, edits, bug fixes, add-page, add-feature, and redesign.');
        return;
      }

      const creditFeature = githubRepoSession
        ? 'APP_BUILDER_GITHUB_EDIT'
        : (MVP_BUILDER_ACTION_CREDIT_FEATURE[localActionType] as CreditFeature) ||
          getMVPActionFeature({
            hasGithubRepo: Boolean(githubRepoSession),
            responseMode,
            hasMessages: messages.length > 0,
          });
      const featureLabel = getMVPActionLabel(creditFeature);

      if (!creditsLoading && creditsAvailable === 0) {
        setIsCreditExhaustedModalOpen(true);
        return;
      }

      if (githubRepoSession) {
        const required = ensureCredits(creditFeature, {
          featureName: featureLabel,
          allowPartialSpend: true,
          suppressCreditPrompt: true,
        });
        if (required === null) return;
        await handleGitHubPrompt(prompt, creditFeature);
        return;
      }

      const required = ensureCredits(creditFeature, {
        featureName: featureLabel,
        requiredCredits: CREDIT_COSTS[creditFeature] ?? 0,
        description: 'MVP Builder uses your regular account credit balance. If you run out, you can upgrade your plan or buy a credit pack.',
        allowPartialSpend: true,
        suppressCreditPrompt: true,
      });
      if (required === null) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      let didTimeout = false;
      const timeoutId = window.setTimeout(() => {
        didTimeout = true;
        controller.abort();
      }, 120000);

      const userMsg = createMessage('user', prompt);
      const assistantMsg = createMessage('assistant', '', {
        isStreaming: true,
        linkedPrompt: prompt,
      });
      const nextMessages = [...messages, userMsg, assistantMsg];
      setMessages(nextMessages);
      setIsGenerating(true);
      markProjectDirty();

      const conversationHistory = messages.map((message) => ({
        role: message.role,
        content: message.content,
      }));
      const currentCode =
        generatedCode ||
        currentHtml ||
        extractGeneratedCode(projectFiles, entryFilePath, currentHtml);
      const preferredFramework = resolvePreferredFramework(
        prompt,
        selectedProjectType,
        projectFiles.length > 0 ? projectFramework : null
      );
      const activeSetupInput: MVPBuilderSetupInput = {
        ...setupInput,
        productName: setupInput.productName || projectName,
        oneLineDescription: setupInput.oneLineDescription || prompt,
        customPrompt: setupInput.customPrompt || prompt,
        template: sanitizeMVPBuilderTemplate(setupInput.template),
        palettePreference: sanitizeMVPBuilderPalette(setupInput.palettePreference),
      };

      try {
        const session = await getSessionSafely();
        const accessToken = session?.access_token;
        const idempotencyKey = createIdempotencyKey(
          'app-builder',
          `${user?.id ?? 'anon'}-${Date.now()}`
        );

        const response = await fetch(STREAM_URL, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Idempotency-Key': idempotencyKey,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify({
            userMessage: prompt,
            mode: 'generate',
            actionType: localActionType,
            template: activeSetupInput.template,
            palettePreference: activeSetupInput.palettePreference,
            setupInput: activeSetupInput,
            projectContext: {
              ...(startupContext ?? {}),
              source: activeSetupInput.prefillSource,
              productName: activeSetupInput.productName,
              audience: activeSetupInput.validatedTargetSegment,
              problem: activeSetupInput.validatedProblemStatement,
              painLanguage: activeSetupInput.keyPainLanguage,
              tagline: activeSetupInput.existingTagline,
            },
            projectId,
            currentVersion: projectVersions[0]?.version_number ?? 0,
            responseMode,
            currentProject:
              projectFiles.length > 0
                ? {
                    projectName,
                    framework: projectFramework,
                    projectType: selectedProjectType,
                    entryFile: entryFilePath,
                    summary: projectSummary,
                    dependencies: projectDependencies,
                    files: projectFiles.map((file) => ({
                      path: file.path,
                      content: file.content,
                    })),
                  }
                : null,
            conversationHistory,
            currentCode,
            selectedModels,
            preferredProjectType: selectedProjectType,
            preferredFramework,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamedContent = '';
        let streamedCode = '';
        let newProject: MVPProjectArtifact | null = null;
        let validatedOutput: MVPBuilderValidatedOutput | null = null;
        let completedActionType: MVPBuilderActionType | null =
          localActionType === 'chat' ? null : localActionType;
        let completedCreditCost = required;
        let completedModel: string | null = null;
        let finalized = false;

        const finalizeResponse = () => {
          if (finalized) return;
          finalized = true;

          if (responseMode === 'chat') {
            const assistantCopy =
              streamedContent.trim() ||
              'I reviewed the request and I am ready to help you shape the next build step.';

            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMsg.id
                  ? {
                      ...message,
                      content: assistantCopy,
                      isStreaming: false,
                      linkedPrompt: prompt,
                      type: 'message',
                      ...(completedModel ? { model: completedModel } : {}),
                    }
                  : message
              )
            );
            void refreshCredits();
            toast.success(`${featureLabel} used ${completedCreditCost} credit${completedCreditCost === 1 ? '' : 's'}.`);
            return;
          }

          let fallbackProject: MVPProjectArtifact | null = null;
          if (streamedCode) {
            try {
              const parsed = validateMVPBuilderOutput(parseMVPBuilderOutput(streamedCode), { phase1Only: false });
              validatedOutput = parsed;
              fallbackProject = {
                projectName: activeSetupInput.productName || projectName,
                framework: parsed.project_type === 'react_vite' ? 'react-vite' : 'static-html',
                projectType: parsed.project_type === 'react_vite' ? 'web-app' : 'landing-page',
                entryFile: parsed.files.find((file) => file.filename === 'index.html')?.filename ?? parsed.files[0]?.filename ?? 'index.html',
                summary: parsed.generation_notes,
                dependencies: extractProjectDependenciesFromFiles(normalizeProjectFiles(parsed.files.map((file) => ({
                  path: file.filename,
                  content: file.content,
                  language: detectProjectFileLanguage(file.filename),
                })))),
                files: normalizeProjectFiles(parsed.files.map((file) => ({
                  path: file.filename,
                  content: file.content,
                  language: detectProjectFileLanguage(file.filename),
                }))),
              };
            } catch {
              fallbackProject = extractProjectFromText(streamedContent, projectName);
            }
          } else {
            fallbackProject = extractProjectFromText(streamedContent, projectName);
          }
          const committedProject = newProject ?? fallbackProject;
          const assistantCopy =
            committedProject?.summary ||
            (messages.length === 0
              ? 'Ready — your build is live.'
              : 'Updated the build and synced the preview.');

          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMsg.id
                ? {
                    ...message,
                    content: assistantCopy,
                    isStreaming: false,
                    linkedPrompt: prompt,
                    type: 'message',
                    ...(completedModel ? { model: completedModel } : {}),
                  }
                : message
            )
          );

          if (committedProject) {
            setLastBuildChangeSummary(buildChangeSummary(prompt, projectFiles, committedProject));
            if (validatedOutput && completedActionType) {
              const version = createMVPBuilderVersion({
                previousVersions: projectVersions,
                actionType: completedActionType,
                userInstruction: prompt,
                creditsUsed: completedCreditCost,
                output: validatedOutput,
              });
              setProjectVersions((prev) => [version, ...prev]);
            }
            applyProjectArtifact(committedProject, {
              allowFallback: false,
              setAsBaseline: true,
              preserveProjectName: projectName !== DEFAULT_PROJECT_NAME,
              preserveProjectType: false,
            });
            addProjectSnapshot(
              committedProject,
              messages.length === 0 ? 'Initial generated build' : 'Generated refinement',
              'generated'
            );
            appendPromptHistory({
              id: crypto.randomUUID(),
              prompt,
              committedAt: assistantMsg.createdAt ?? new Date().toISOString(),
              commitRef: `build-${assistantMsg.id.slice(0, 8)}`,
            });
            void refreshCredits();
            toast.success(`${featureLabel} used ${completedCreditCost} credit${completedCreditCost === 1 ? '' : 's'}.`);
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            finalizeResponse();
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const raw = line.slice(6).trim();
            if (raw === '[DONE]') {
              finalizeResponse();
              return;
            }

            let event: Record<string, unknown>;
            try {
              event = JSON.parse(raw);
            } catch {
              continue;
            }

            if (event.type === 'delta' && typeof event.content === 'string') {
              streamedContent += event.content;
              if (responseMode === 'chat') {
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantMsg.id
                      ? {
                          ...message,
                          content: streamedContent,
                        }
                      : message
                  )
                );
              }
            } else if (event.type === 'code-delta' && typeof event.content === 'string') {
              streamedCode += event.content;
              const completedHtml = extractHtmlFromText(streamedCode);

              if (completedHtml && /<\/html>/i.test(completedHtml)) {
                const liveProject = createProjectFromHtml(completedHtml, projectName);
                applyProjectArtifact(liveProject, {
                  allowFallback: false,
                  setAsBaseline: false,
                  preserveProjectName: true,
                  preserveProjectType: true,
                });
              } else {
                setGeneratedCode(sanitizeStreamedCode(streamedCode));
              }
            } else if (event.type === 'credit-reserved') {
              void refreshCredits();
            } else if (event.type === 'credit-finalized') {
              if (typeof event.creditsUsed === 'number') {
                completedCreditCost = event.creditsUsed;
              }
              void refreshCredits();
            } else if (event.type === 'credit-released') {
              void refreshCredits();
            } else if (event.type === 'project' && typeof event.project === 'object' && event.project !== null) {
              const nextProject = event.project as MVPProjectArtifact;
              if (event.output && typeof event.output === 'object') {
                try {
                  validatedOutput = validateMVPBuilderOutput(event.output, { phase1Only: false });
                } catch {
                  validatedOutput = null;
                }
              }
              if (
                event.actionType === 'generation' ||
                event.actionType === 'targeted_edit' ||
                event.actionType === 'debug' ||
                event.actionType === 'add_page' ||
                event.actionType === 'add_feature' ||
                event.actionType === 'design_overhaul'
              ) {
                completedActionType = event.actionType;
              }
              if (typeof event.creditCost === 'number') {
                completedCreditCost = event.creditCost;
              }
              newProject = {
                projectName:
                  typeof nextProject.projectName === 'string' && nextProject.projectName.trim()
                    ? nextProject.projectName
                    : projectName,
                framework: inferProjectFramework(
                  normalizeProjectFiles(nextProject.files || []),
                  nextProject.framework
                ),
                entryFile: nextProject.entryFile,
                projectType: nextProject.projectType,
                summary: nextProject.summary,
                dependencies: nextProject.dependencies,
                files: normalizeProjectFiles(nextProject.files || []),
              };
              setGeneratedCode(extractGeneratedCode(newProject.files, newProject.entryFile, null));
            } else if (event.type === 'complete') {
              completedModel = typeof event.model === 'string' ? event.model : null;
              finalizeResponse();
              return;
            } else if (event.type === 'error') {
              const errMsg = (event.error as string) ?? 'Something went wrong.';
              const errCode = event.errorCode as string | undefined;
              if (errCode === 'INSUFFICIENT_CREDITS') {
                setIsCreditExhaustedModalOpen(true);
              } else {
                handleCreditError(
                  { message: errMsg, status: 500 },
                  { error: errMsg, errorCode: errCode },
                  creditFeature
                );
              }
              void refreshCredits();
              setMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantMsg.id
                    ? {
                        ...message,
                        content: errMsg,
                        isStreaming: false,
                        type: 'error',
                        retryPrompt: prompt,
                      }
                    : message
                )
              );
              return;
            }
          }
        }
      } catch (error: unknown) {
        if ((error as Error)?.name === 'AbortError') {
          if (!didTimeout) {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMsg.id
                  ? {
                      ...message,
                      content: 'Generation stopped.',
                      isStreaming: false,
                    }
                  : message
              )
            );
            return;
          }
          toast.error('Request timed out. Please try a simpler prompt.');
          setMessages((prev) =>
            prev.map((message) =>
              message.id === assistantMsg.id
                ? {
                    ...message,
                    content: 'Request timed out. Please try a shorter or simpler prompt.',
                    isStreaming: false,
                    type: 'error',
                    retryPrompt: prompt,
                  }
                : message
            )
          );
          return;
        }
        toast.error('Connection error. Please try again.');
        setMessages((prev) =>
          prev.map((message) =>
            message.id === assistantMsg.id
              ? {
                  ...message,
                  content: 'Connection error. Please try again.',
                  isStreaming: false,
                  type: 'error',
                  retryPrompt: prompt,
                }
              : message
          )
        );
      } finally {
        clearTimeout(timeoutId);
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    [
      appendPromptHistory,
      addProjectSnapshot,
      applyProjectArtifact,
      entryFilePath,
      ensureCredits,
      generatedCode,
      githubRepoSession,
      handleCreditError,
      handleGitHubPrompt,
      integrationReady,
      isGenerating,
      isGitHubBusy,
      markProjectDirty,
      messages,
      currentHtml,
      creditsAvailable,
      creditsLoading,
      projectFiles,
      projectId,
      projectDependencies,
      projectFramework,
      projectName,
      projectSummary,
      projectVersions,
      refreshCredits,
      selectedModels,
      selectedProjectType,
      setupInput,
      startupContext,
      user,
    ]
  );

  const setEntryFilePath = useCallback(
    (path: string) => {
      const normalizedPath = normalizeProjectPath(path);
      if (!normalizedPath) return;
      setEntryFilePathState(normalizedPath);
      refreshPreview(projectFiles, normalizedPath, {
        allowFallback: true,
      });
      markProjectDirty();
    },
    [markProjectDirty, projectFiles, refreshPreview]
  );

  const setSelectedProjectType = useCallback((projectType: MVPProjectType) => {
    setSelectedProjectTypeState(sanitizeMVPProjectType(projectType));
    markProjectDirty();
  }, [markProjectDirty]);

  const setProjectName = useCallback((name: string) => {
    setProjectNameState(name || DEFAULT_PROJECT_NAME);
    setSetupInputState((prev) => ({
      ...prev,
      productName: prev.productName || name,
    }));
    markProjectDirty();
  }, [markProjectDirty]);

  const setSetupInput = useCallback((next: Partial<MVPBuilderSetupInput>) => {
    setSetupInputState((prev) => ({
      ...prev,
      ...next,
      template: sanitizeMVPBuilderTemplate(next.template ?? prev.template),
      palettePreference: sanitizeMVPBuilderPalette(next.palettePreference ?? prev.palettePreference),
    }));
    markProjectDirty();
  }, [markProjectDirty]);

  const updateProjectFile = useCallback(
    (path: string, content: string) => {
      const normalizedPath = normalizeProjectPath(path);
      if (!normalizedPath) return;

      let nextFiles = projectFiles;
      let found = false;
      nextFiles = normalizeProjectFiles(
        projectFiles.map((file) => {
          if (file.path !== normalizedPath) return file;
          found = true;
          return {
            ...file,
            content,
          };
        })
      );

      if (!found) {
        nextFiles = normalizeProjectFiles([
          ...projectFiles,
          {
            path: normalizedPath,
            content,
            language: detectProjectFileLanguage(normalizedPath),
          },
        ]);
      }

      setProjectFiles(nextFiles);
      setProjectFramework(inferProjectFramework(nextFiles, projectFramework));
      setProjectDependencies((prev) => {
        const fileDependencies = extractProjectDependenciesFromFiles(nextFiles);
        return fileDependencies.length > 0 || normalizedPath === 'package.json'
          ? fileDependencies
          : prev;
      });
      setGeneratedCode(extractGeneratedCode(nextFiles, entryFilePath || normalizedPath, currentHtml));
      refreshPreview(nextFiles, entryFilePath || normalizedPath, {
        allowFallback: true,
      });
      markProjectDirty();

      if (githubRepoSession) {
        const sourceFile = githubRepoSession.files.find((file) => file.path === normalizedPath);
        setGitHubPendingChanges((prev) => {
          const remaining = prev.filter((change) => change.path !== normalizedPath);
          if (sourceFile && sourceFile.content === content) {
            return remaining;
          }
          return [
            ...remaining,
            {
              path: normalizedPath,
              action: sourceFile ? 'update' : 'create',
              content,
              previousContent: sourceFile?.content,
              reason: 'Manual edit from Code tab',
            },
          ].sort((a, b) => a.path.localeCompare(b.path));
        });
      }
    },
    [currentHtml, entryFilePath, githubRepoSession, markProjectDirty, projectFiles, projectFramework, refreshPreview]
  );

  const resetProjectFile = useCallback(
    (path: string) => {
      const normalizedPath = normalizeProjectPath(path);
      if (!normalizedPath || !lastGeneratedProject) return;

      const baselineFile = lastGeneratedProject.files.find(
        (file) => file.path === normalizedPath
      );
      if (!baselineFile) return;

      updateProjectFile(normalizedPath, baselineFile.content);
      toast.success(`Reset ${normalizedPath} to the last saved build.`);
    },
    [lastGeneratedProject, updateProjectFile]
  );

  const resetProjectCode = useCallback(() => {
    if (!lastGeneratedProject) return;

    applyProjectArtifact(lastGeneratedProject, {
      allowFallback: false,
      setAsBaseline: true,
      preserveProjectName: true,
    });

    if (githubRepoSession) {
      const sourceMap = new Map(
        githubRepoSession.files.map((file) => [file.path, file.content])
      );
      const resetChanges = lastGeneratedProject.files
        .map((file) => {
          const originalContent = sourceMap.get(file.path);
          if (originalContent === undefined || originalContent === file.content) {
            return null;
          }
          return {
            path: file.path,
            action: 'update' as const,
            content: file.content,
            previousContent: originalContent,
            reason: 'Reset project to baseline',
          };
        })
        .filter((item): item is GitHubFileChange => Boolean(item));

      setGitHubPendingChanges(resetChanges);
    }

    toast.success('Reset the project code to the last saved build.');
    markProjectDirty();
  }, [applyProjectArtifact, githubRepoSession, lastGeneratedProject, markProjectDirty]);

  const createManualSnapshot = useCallback(() => {
    if (projectFiles.length === 0) return;

    const artifact = normalizeSnapshotArtifact({
      projectName,
      framework: projectFramework,
      projectType: selectedProjectType,
      entryFile: entryFilePath,
      summary: projectSummary,
      dependencies: projectDependencies,
      files: projectFiles,
    });
    addProjectSnapshot(artifact, 'Manual snapshot', 'manual');
    toast.success('Created a project snapshot.');
    markProjectDirty();
  }, [
    addProjectSnapshot,
    entryFilePath,
    markProjectDirty,
    projectDependencies,
    projectFiles,
    projectFramework,
    projectName,
    projectSummary,
    selectedProjectType,
  ]);

  const restoreProjectSnapshot = useCallback(
    async (snapshotId: string) => {
      const snapshot = projectSnapshots.find((item) => item.id === snapshotId);
      if (!snapshot) return;
      if (creditsLoading) {
        toast('Loading credit balance...');
        return;
      }
      if (creditsAvailable === 0) {
        setIsCreditExhaustedModalOpen(true);
        return;
      }
      const reservation = await reserveMVPBuilderCredits('APP_BUILDER_RESTORE', {
        featureName: getMVPActionLabel('APP_BUILDER_RESTORE'),
        idempotencyKey: `restore-${snapshot.id}`,
        allowPartialSpend: true,
        suppressCreditPrompt: true,
        metadata: {
          mvpBuilderActionType: 'restore',
          projectId,
          snapshotId,
        },
      });
      if (!reservation?.reservationId) return;

      try {
        applyProjectArtifact(snapshot.artifact, {
          allowFallback: false,
          setAsBaseline: false,
          preserveProjectName: false,
          preserveProjectType: false,
        });
        addProjectSnapshot(snapshot.artifact, `Restored ${snapshot.label}`, 'restore');
        const finalized = await finalizeMVPBuilderCredits('APP_BUILDER_RESTORE', reservation.reservationId, {
          featureName: getMVPActionLabel('APP_BUILDER_RESTORE'),
          metadata: {
            mvpBuilderActionType: 'restore',
            projectId,
            snapshotId,
            completionBoundary: 'snapshot_applied',
          },
        });
        if (!finalized) throw new Error('Unable to finalize restore credits');
        toast.success(`Restored snapshot: ${snapshot.label}`);
        markProjectDirty();
      } catch (error) {
        await releaseMVPBuilderCredits(reservation.reservationId, 'MVP Builder restore failed', {
          projectId,
          snapshotId,
          error: error instanceof Error ? error.message : String(error),
        });
        toast.error('Restore failed. Held credits were released.');
      }
    },
    [addProjectSnapshot, applyProjectArtifact, creditsAvailable, creditsLoading, finalizeMVPBuilderCredits, markProjectDirty, projectId, projectSnapshots, releaseMVPBuilderCredits, reserveMVPBuilderCredits]
  );

  const exportProjectZip = useCallback(() => {
    if (projectFiles.length === 0) {
      toast.error('Generate a project before exporting code.');
      return;
    }
    const blob = buildMVPProjectZip(projectFiles);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(projectName || 'mvp').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'mvp'}.zip`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exported MVP source ZIP.');
  }, [projectFiles, projectName]);

  const deployProject = useCallback(async () => {
    if (!user || projectFiles.length === 0 || isDeploying) {
      if (!user) toast.error('Please sign in to deploy this MVP.');
      if (projectFiles.length === 0) toast.error('Generate a project before deploying.');
      return;
    }
    if (creditsLoading) {
      toast('Loading credit balance...');
      return;
    }
    if (creditsAvailable === 0) {
      setIsCreditExhaustedModalOpen(true);
      return;
    }

    await saveProject({ silent: true });
    setIsDeploying(true);
    try {
      const session = await getSessionSafely();
      const accessToken = session?.access_token;
      const idempotencyKey = createIdempotencyKey('mvp-builder-deploy', `${projectId}-${Date.now()}`);
      const { data, error } = await supabase.functions.invoke('mvp-builder-deploy', {
        headers: {
          'Idempotency-Key': idempotencyKey,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: { projectId },
      });

      if (error || !data?.ok) {
        if (data?.errorCode === 'INSUFFICIENT_CREDITS') {
          setIsCreditExhaustedModalOpen(true);
        } else {
          handleCreditError(error, data, 'APP_BUILDER_DEPLOY');
        }
        toast.error(data?.error || 'Deployment failed.');
        void refreshCredits();
        return;
      }

      setDeploymentUrl(data.deploymentUrl);
      void refreshCredits();
      toast.success(`MVP deployed for ${Number(data.creditsUsed ?? CREDIT_COSTS.APP_BUILDER_DEPLOY)} credits.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Deployment failed.');
    } finally {
      setIsDeploying(false);
    }
  }, [creditsAvailable, creditsLoading, handleCreditError, isDeploying, projectFiles.length, projectId, refreshCredits, saveProject, user]);

  const closeCreditExhaustedModal = useCallback(() => {
    setIsCreditExhaustedModalOpen(false);
  }, []);

  const setSelectedModels = useCallback((models: string[]) => {
    setSelectedModelsState(sanitizeMVPModelSelection(models));
    markProjectDirty();
  }, [markProjectDirty]);

  const cancelGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const resetProject = useCallback(() => {
    abortRef.current?.abort();
    const newId = crypto.randomUUID();
    replaceMessages([]);
    setProjectFiles([]);
    setEntryFilePathState('index.html');
    setProjectFramework('static-html');
    setSelectedProjectTypeState(MVP_DEFAULT_PROJECT_TYPE);
    setProjectSummary('Generated with MVP Builder.');
    setProjectDependencies([]);
    setCurrentHtml(null);
    setGeneratedCode('');
    setPreviewState({
      html: null,
      entryFile: null,
      canPreview: false,
      warnings: [],
      errors: [],
      runtimeMode: 'none',
      consoleHints: [],
    });
    setSelectedCodeFilePath(null);
    setLastGeneratedProject(null);
    setProjectSnapshots([]);
    setProjectVersions([]);
    setSetupInputState(createDefaultSetupInput());
    setLastActionQuote(null);
    setDeploymentUrl(null);
    setIsDeploying(false);
    setLastBuildChangeSummary(null);
    setIsShowingPreviewFallback(false);
    lastStablePreviewHtmlRef.current = null;
    setProjectNameState(DEFAULT_PROJECT_NAME);
    setProjectId(newId);
    setLastSavedAt(null);
    setHasUnsavedChanges(false);
    setSelectedModelsState([MVP_DEFAULT_MODEL]);
    setIsGenerating(false);

    setGitHubRepoSession(null);
    setGitHubPendingChanges([]);
    setGitHubCommitHistory([]);
    setLastGitHubPrompt(null);
    setSuggestedGitHubCommitMessage(null);
    setGitHubBranches([]);

    localStorage.removeItem(STORAGE_KEY);
  }, [replaceMessages]);

  const codeChanges = lastGeneratedProject
    ? getChangedProjectFiles(projectFiles, lastGeneratedProject.files)
    : [];
  const saveStatus =
    isGenerating ? 'generating' : hasUnsavedChanges ? 'unsaved' : lastSavedAt ? 'saved' : 'idle';

  return {
    messages,
    projectFiles,
    entryFilePath,
    projectFramework,
    selectedProjectType,
    projectSummary,
    projectDependencies,
    currentHtml,
    generatedCode,
    previewState,
    selectedCodeFilePath,
    lastGeneratedProject,
    projectSnapshots,
    codeChanges,
    lastBuildChangeSummary,
    isShowingPreviewFallback,
    isGenerating,
    isSavingProject,
    saveStatus,
    hasUnsavedChanges,
    projectName,
    projectId,
    lastSavedAt,
    savedProjects,
    isProjectsLoading,
    promptHistory,
    selectedModels,
    setupInput,
    projectVersions,
    lastActionQuote,
    deploymentUrl,
    isDeploying,
    creditsAvailable,
    heldCredits,
    isCreditExhaustedModalOpen,
    githubConnection,
    githubRepositories,
    githubBranches,
    githubRepoSession,
    githubPendingChanges,
    githubCommitHistory,
    isGitHubBusy,
    suggestedGitHubCommitMessage,
    supabaseConnection,
    supabaseProjects,
    supabaseBackendSnapshot,
    isSupabaseBusy,
    integrations,
    integrationReady,
    setProjectName,
    setSetupInput,
    setSelectedProjectType,
    setSelectedCodeFilePath,
    setEntryFilePath,
    updateProjectFile,
    resetProjectFile,
    resetProjectCode,
    createManualSnapshot,
    restoreProjectSnapshot,
    exportProjectZip,
    deployProject,
    setSelectedModels,
    sendMessage,
    classifyActionQuote,
    cancelGeneration,
    saveProject,
    loadProject,
    loadProjects,
    deleteProject,
    resetProject,
    connectGitHub,
    disconnectGitHub,
    refreshGitHubConnection,
    loadGitHubRepositories,
    loadGitHubBranches,
    importGitHubRepository,
    loadGitHubCommitHistory,
    discardGitHubChanges,
    commitGitHubChanges,
    rollbackGitHubCommit,
    saveSupabaseCredentials,
    disconnectSupabaseProject,
    refreshSupabaseConnection,
    loadSupabaseBackendSnapshot,
    closeCreditExhaustedModal,
  };
}
