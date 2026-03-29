import { useState, useEffect, useCallback, useRef } from 'react';
import { getAccessTokenSafely, getSessionSafely } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useCreditActions } from '@/hooks/useCreditActions';
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
import {
  buildPreviewFromProject,
  createProjectFromHtml,
  detectProjectFileLanguage,
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
  profile: {
    login?: string;
    name?: string | null;
    avatar_url?: string | null;
    scope?: string;
  } | null;
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
  created_at: string;
  updated_at: string;
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
const STORAGE_KEY = 'ct_app_builder_session';

export function useMVPBuilder() {
  const { user } = useAuth();
  const { ensureCredits, handleCreditError } = useCreditActions();

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
  const [isShowingPreviewFallback, setIsShowingPreviewFallback] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [projectName, setProjectNameState] = useState(DEFAULT_PROJECT_NAME);
  const [projectId, setProjectId] = useState<string>(() => crypto.randomUUID());
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [savedProjects, setSavedProjects] = useState<MVPProjectRecord[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(false);
  const [promptHistory, setPromptHistory] = useState<MVPPromptHistoryItem[]>([]);
  const [selectedModels, setSelectedModelsState] = useState<string[]>([MVP_DEFAULT_MODEL]);

  const [githubConnection, setGitHubConnection] = useState<GitHubConnectionState>({
    connected: false,
    profile: null,
  });
  const [githubRepositories, setGitHubRepositories] = useState<GitHubRepositorySummary[]>([]);
  const [githubBranches, setGitHubBranches] = useState<string[]>([]);
  const [githubRepoSession, setGitHubRepoSession] = useState<GitHubRepoSession | null>(null);
  const [githubPendingChanges, setGitHubPendingChanges] = useState<GitHubFileChange[]>([]);
  const [githubCommitHistory, setGitHubCommitHistory] = useState<GitHubCommitRecord[]>([]);
  const [lastGitHubPrompt, setLastGitHubPrompt] = useState<string | null>(null);
  const [suggestedGitHubCommitMessage, setSuggestedGitHubCommitMessage] = useState<string | null>(null);
  const [isGitHubBusy, setIsGitHubBusy] = useState(false);

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
      generatedProject: MVPProjectArtifact | null
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
      lastGeneratedProject
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
      setProjectSnapshots([]);
      setSelectedModelsState([MVP_DEFAULT_MODEL]);
      setGitHubRepoSession(null);
      setGitHubPendingChanges([]);
      setGitHubCommitHistory([]);
      setLastGitHubPrompt(null);
      setSuggestedGitHubCommitMessage(null);
      setGitHubBranches([]);

      if (record.generated_code) {
        const artifact = createProjectFromHtml(record.generated_code, record.title || DEFAULT_PROJECT_NAME);
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
        .select('id, title, prompt_history, generated_code, created_at, updated_at')
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
        updated_at: timestamp,
      };

      setIsSavingProject(true);
      try {
        const { data, error } = await supabase
          .from(MVP_PROJECTS_TABLE as never)
          .upsert(payload)
          .select('id, title, prompt_history, generated_code, created_at, updated_at')
          .single();

        if (error) throw error;

        const savedRecord: MVPProjectRecord = {
          id: String(data.id),
          title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : DEFAULT_PROJECT_NAME,
          prompt_history: Array.isArray(data.prompt_history) ? (data.prompt_history as MVPMessage[]) : payload.prompt_history,
          generated_code: typeof data.generated_code === 'string' ? data.generated_code : codeToSave,
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
    [currentHtml, entryFilePath, generatedCode, messages, projectFiles, projectId, projectName, user]
  );

  const loadProject = useCallback(
    async (id: string) => {
      if (!user || !id) return;

      try {
        let project = savedProjects.find((item) => item.id === id) ?? null;
        if (!project) {
          const { data, error } = await supabase
            .from(MVP_PROJECTS_TABLE as never)
            .select('id, title, prompt_history, generated_code, created_at, updated_at')
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
      setGitHubConnection({ connected: false, profile: null });
      return;
    }
    try {
      const result = await callGitHubFunction<{
        connected: boolean;
        profile: GitHubConnectionState['profile'];
      }>('get_connection');
      setGitHubConnection({
        connected: Boolean(result.connected),
        profile: result.profile ?? null,
      });
    } catch {
      setGitHubConnection({ connected: false, profile: null });
    }
  }, [callGitHubFunction, user]);

  useEffect(() => {
    refreshGitHubConnection();
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
  }, [callGitHubFunction, user]);

  const disconnectGitHub = useCallback(async () => {
    setIsGitHubBusy(true);
    try {
      await callGitHubFunction('disconnect');
      setGitHubConnection({ connected: false, profile: null });
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
          branch,
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
        toast.success(`Imported ${session.fullName} (${session.branch})`);
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
          baseBranch: githubRepoSession.branch,
          targetBranch: options?.targetBranch || githubRepoSession.branch,
          createPullRequest: Boolean(options?.createPullRequest),
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
    async (prompt: string, creditFeature: string) => {
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
    [applyProjectArtifact, callGitHubFunction, entryFilePath, githubRepoSession, handleCreditError, markProjectDirty, selectedModels]
  );

  const sendMessage = useCallback(
    async (prompt: string) => {
      if (!prompt.trim() || isGenerating || isGitHubBusy) return;

      const creditFeature = githubRepoSession
        ? 'APP_BUILDER_REFINE'
        : messages.length === 0
        ? 'APP_BUILDER_GENERATE'
        : 'APP_BUILDER_REFINE';
      const featureLabel = creditFeature === 'APP_BUILDER_GENERATE'
        ? 'AI App Builder — Generate'
        : githubRepoSession
        ? 'AI App Builder — GitHub Edit'
        : 'AI App Builder — Refine';

      const required = ensureCredits(creditFeature, {
        featureName: featureLabel,
      });
      if (required === null) return;

      if (githubRepoSession) {
        await handleGitHubPrompt(prompt, creditFeature);
        return;
      }

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
            userId: user?.id ?? null,
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
        let completedModel: string | null = null;
        let finalized = false;

        const finalizeResponse = () => {
          if (finalized) return;
          finalized = true;

          const fallbackProject = streamedCode
            ? createProjectFromHtml(sanitizeStreamedCode(streamedCode), projectName)
            : extractProjectFromText(streamedContent, projectName);
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
            toast.success('Ready — your build is live.');
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
            } else if (event.type === 'code-delta' && typeof event.content === 'string') {
              streamedCode += event.content;
              const liveCode = sanitizeStreamedCode(streamedCode);
              setGeneratedCode(liveCode);
              setCurrentHtml(liveCode || null);
              setPreviewState({
                html: liveCode || null,
                entryFile: 'index.html',
                canPreview: Boolean(liveCode),
                warnings: [],
                errors: [],
                runtimeMode: 'none',
                consoleHints: [],
              });
            } else if (event.type === 'project' && typeof event.project === 'object' && event.project !== null) {
              const nextProject = event.project as MVPProjectArtifact;
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
              handleCreditError(
                { message: errMsg, status: errCode === 'INSUFFICIENT_CREDITS' ? 402 : 500 },
                { error: errMsg, errorCode: errCode },
                creditFeature
              );
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
      isGenerating,
      isGitHubBusy,
      markProjectDirty,
      messages,
      currentHtml,
      projectFiles,
      projectDependencies,
      projectFramework,
      projectName,
      projectSummary,
      selectedModels,
      selectedProjectType,
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
    (snapshotId: string) => {
      const snapshot = projectSnapshots.find((item) => item.id === snapshotId);
      if (!snapshot) return;

      applyProjectArtifact(snapshot.artifact, {
        allowFallback: false,
        setAsBaseline: false,
        preserveProjectName: false,
        preserveProjectType: false,
      });
      addProjectSnapshot(snapshot.artifact, `Restored ${snapshot.label}`, 'restore');
      toast.success(`Restored snapshot: ${snapshot.label}`);
      markProjectDirty();
    },
    [addProjectSnapshot, applyProjectArtifact, markProjectDirty, projectSnapshots]
  );

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
    githubConnection,
    githubRepositories,
    githubBranches,
    githubRepoSession,
    githubPendingChanges,
    githubCommitHistory,
    isGitHubBusy,
    suggestedGitHubCommitMessage,
    setProjectName,
    setSelectedProjectType,
    setSelectedCodeFilePath,
    setEntryFilePath,
    updateProjectFile,
    resetProjectFile,
    resetProjectCode,
    createManualSnapshot,
    restoreProjectSnapshot,
    setSelectedModels,
    sendMessage,
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
  };
}
