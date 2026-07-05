import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Send,
  Loader2,
  Wand2,
  RotateCcw,
  Clock3,
  Bot,
  Check,
  Github,
  GitBranch,
  GitCommitHorizontal,
  ExternalLink,
  RefreshCw,
  Undo2,
  Square,
  X,
  AtSign,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  Sparkles,
  Bug,
  Palette,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { MVPMessageItem } from './MVPMessageItem';
import type {
  MVPMessage,
  MVPPromptHistoryItem,
  GitHubConnectionState,
  GitHubRepositorySummary,
  GitHubRepoSession,
  GitHubFileChange,
  GitHubCommitRecord,
  MVPBuildChangeSummary,
  MVPBuilderResponseMode,
  MVPActionQuote,
} from '@/hooks/useMVPBuilder';
import type { MVPBuilderSetupInput, MVPBuilderVersion } from '@/lib/mvp-builder/phase1';
import {
  MVP_BUILDER_ACTION_LABELS,
} from '@/lib/mvp-builder/phase1';
import {
  MVP_DEFAULT_MODEL,
  MVP_MODEL_OPTIONS,
  getMVPModelLabel,
} from '@/data/mvpModels';
import type { MVPProjectType } from '@/lib/mvp-builder/project';
import { cn } from '@/lib/utils';

// ── Quick-start templates ────────────────────────────────────────────────────

const DIFF_PREVIEW_LINE_LIMIT = 140;
const DIFF_CONTEXT_LINES = 3;

const REFERENCE_OPTIONS = [
  {
    id: 'icp-profile',
    label: '@icp-profile',
    description: 'Use the founder ICP and pain-point framing as the primary user context.',
  },
  {
    id: 'pmf-score',
    label: '@pmf-score',
    description: 'Use the latest validation and PMF signal to guide positioning and UX emphasis.',
  },
  {
    id: 'brand-kit',
    label: '@brand-kit',
    description: 'Respect the current brand voice, palette, and visual tone when shaping the build.',
  },
] as const;

type BuilderReferenceId = (typeof REFERENCE_OPTIONS)[number]['id'];


type QueuedSubmission = {
  id: string;
  prompt: string;
  mode: MVPBuilderResponseMode;
};

type DiffPreviewLine = {
  type: 'context' | 'add' | 'remove';
  text: string;
  oldLine: number | null;
  newLine: number | null;
};

function splitContentLines(value: string | undefined): string[] {
  if (typeof value !== 'string') return [];
  return value.replace(/\r\n/g, '\n').split('\n');
}

function limitDiffLines(lines: DiffPreviewLine[]) {
  if (lines.length <= DIFF_PREVIEW_LINE_LIMIT) {
    return { lines, truncated: false };
  }
  return {
    lines: lines.slice(0, DIFF_PREVIEW_LINE_LIMIT),
    truncated: true,
  };
}

function buildDiffPreview(change: GitHubFileChange) {
  const oldLines = splitContentLines(change.previousContent);
  const newLines = splitContentLines(change.content);

  if (change.action === 'create') {
    const safeLines = newLines.length > 0 ? newLines : [''];
    return limitDiffLines(
      safeLines.map((line, index) => ({
        type: 'add' as const,
        text: line,
        oldLine: null,
        newLine: index + 1,
      }))
    );
  }

  if (change.action === 'delete') {
    const safeLines = oldLines.length > 0 ? oldLines : [''];
    return limitDiffLines(
      safeLines.map((line, index) => ({
        type: 'remove' as const,
        text: line,
        oldLine: index + 1,
        newLine: null,
      }))
    );
  }

  let start = 0;
  while (
    start < oldLines.length &&
    start < newLines.length &&
    oldLines[start] === newLines[start]
  ) {
    start += 1;
  }

  let oldEnd = oldLines.length - 1;
  let newEnd = newLines.length - 1;
  while (
    oldEnd >= start &&
    newEnd >= start &&
    oldLines[oldEnd] === newLines[newEnd]
  ) {
    oldEnd -= 1;
    newEnd -= 1;
  }

  const lines: DiffPreviewLine[] = [];

  if (start > oldEnd && start > newEnd) {
    const safeLines = newLines.length > 0 ? newLines : oldLines;
    const preview = safeLines.slice(0, DIFF_CONTEXT_LINES * 2 + 1);
    return {
      lines: preview.map((line, index) => ({
        type: 'context' as const,
        text: line,
        oldLine: index + 1,
        newLine: index + 1,
      })),
      truncated: safeLines.length > preview.length,
    };
  }

  const beforeStart = Math.max(0, start - DIFF_CONTEXT_LINES);
  for (let i = beforeStart; i < start; i += 1) {
    lines.push({
      type: 'context',
      text: oldLines[i] ?? '',
      oldLine: i + 1,
      newLine: i + 1,
    });
  }

  for (let i = start; i <= oldEnd; i += 1) {
    lines.push({
      type: 'remove',
      text: oldLines[i] ?? '',
      oldLine: i + 1,
      newLine: null,
    });
  }

  for (let i = start; i <= newEnd; i += 1) {
    lines.push({
      type: 'add',
      text: newLines[i] ?? '',
      oldLine: null,
      newLine: i + 1,
    });
  }

  const afterOldStart = oldEnd + 1;
  const afterNewStart = newEnd + 1;
  const afterCount = Math.min(
    DIFF_CONTEXT_LINES,
    Math.min(oldLines.length - afterOldStart, newLines.length - afterNewStart)
  );

  for (let offset = 0; offset < afterCount; offset += 1) {
    lines.push({
      type: 'context',
      text: newLines[afterNewStart + offset] ?? '',
      oldLine: afterOldStart + offset + 1,
      newLine: afterNewStart + offset + 1,
    });
  }

  return limitDiffLines(lines);
}

function formatLineNumber(value: number | null): string {
  return value === null ? '' : String(value);
}

function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return 'Unknown date';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getMentionQuery(value: string): string | null {
  const match = value.match(/(?:^|\s)@([a-z0-9-]*)$/i);
  return match ? match[1].toLowerCase() : null;
}

function stripTrailingMention(value: string): string {
  return value.replace(/(?:^|\s)@[a-z0-9-]*$/i, ' ').replace(/\s+$/, '');
}

interface MVPBuilderChatProps {
  messages: MVPMessage[];
  promptHistory: MVPPromptHistoryItem[];
  selectedModels: string[];
  selectedProjectType: MVPProjectType;
  githubConnection: GitHubConnectionState;
  githubRepositories: GitHubRepositorySummary[];
  githubBranches: string[];
  githubRepoSession: GitHubRepoSession | null;
  githubPendingChanges: GitHubFileChange[];
  githubCommitHistory: GitHubCommitRecord[];
  isGitHubBusy: boolean;
  suggestedGitHubCommitMessage: string | null;
  integrationReady: boolean;
  lastBuildChangeSummary: MVPBuildChangeSummary | null;
  setupInput: MVPBuilderSetupInput;
  projectVersions: MVPBuilderVersion[];
  lastActionQuote: MVPActionQuote | null;
  onSelectedModelsChange: (models: string[]) => void;
  onSetupInputChange: (next: Partial<MVPBuilderSetupInput>) => void;
  onProjectTypeChange: (projectType: MVPProjectType) => void;
  onSend: (
    prompt: string,
    options?: { responseMode?: MVPBuilderResponseMode }
  ) => void | Promise<unknown>;
  onClassifyAction: (prompt: string) => Promise<MVPActionQuote | null>;
  onCancelGeneration: () => void;
  onConnectGitHub: () => void | Promise<void>;
  onDisconnectGitHub: () => void | Promise<void>;
  onLoadGitHubRepositories: () => void | Promise<void>;
  onLoadGitHubBranches: (fullName: string) => void | Promise<void>;
  onImportGitHubRepository: (fullName: string, branch?: string) => void | Promise<void>;
  onDiscardGitHubChanges: () => void;
  onCommitGitHubChanges: (options?: {
    createPullRequest?: boolean;
    targetBranch?: string;
    prTitle?: string;
    prBody?: string;
    commitMessage?: string;
  }) => void | Promise<unknown>;
  onRollbackGitHubCommit: (sha: string) => void | Promise<void>;
  onRefreshGitHubCommitHistory: (fullName?: string, branch?: string) => void | Promise<void>;
  isGenerating: boolean;
}

export const MVPBuilderChat: React.FC<MVPBuilderChatProps> = ({
  messages,
  promptHistory,
  selectedModels,
  selectedProjectType: _selectedProjectType,
  githubConnection,
  githubRepositories,
  githubBranches,
  githubRepoSession,
  githubPendingChanges,
  githubCommitHistory,
  isGitHubBusy,
  suggestedGitHubCommitMessage,
  integrationReady,
  lastBuildChangeSummary,
  setupInput: _setupInput,
  projectVersions,
  lastActionQuote,
  onSelectedModelsChange,
  onSetupInputChange: _onSetupInputChange,
  onProjectTypeChange: _onProjectTypeChange,
  onSend,
  onClassifyAction,
  onCancelGeneration,
  onConnectGitHub,
  onDisconnectGitHub,
  onLoadGitHubRepositories,
  onLoadGitHubBranches,
  onImportGitHubRepository,
  onDiscardGitHubChanges,
  onCommitGitHubChanges,
  onRollbackGitHubCommit,
  onRefreshGitHubCommitHistory,
  isGenerating,
}) => {
  const [input, setInput] = useState('');
  const [builderMode, setBuilderMode] = useState<MVPBuilderResponseMode>('build');
  const [selectedReferences, setSelectedReferences] = useState<BuilderReferenceId[]>([]);
  const [queuedSubmissions, setQueuedSubmissions] = useState<QueuedSubmission[]>([]);
  const [changeCards, setChangeCards] = useState<MVPBuildChangeSummary[]>([]);
  const [expandedChangeCards, setExpandedChangeCards] = useState<Record<string, boolean>>({});
  const [historyOpen, setHistoryOpen] = useState(false);
  const [modelsOpen, setModelsOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [prBranchName, setPrBranchName] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousGeneratingRef = useRef(isGenerating);
  const isEmpty = messages.length === 0;
  const sortedHistory = useMemo(
    () =>
      [...promptHistory].sort(
        (a, b) => new Date(b.committedAt).getTime() - new Date(a.committedAt).getTime()
      ),
    [promptHistory]
  );
  const selectedModelLabels = useMemo(
    () => selectedModels.map((id) => getMVPModelLabel(id) ?? id),
    [selectedModels]
  );
  const selectedRepoMeta = useMemo(
    () => githubRepositories.find((repo) => repo.fullName === selectedRepo) ?? null,
    [githubRepositories, selectedRepo]
  );
  const availableBranches = useMemo(() => {
    if (githubBranches.length > 0) return githubBranches;
    if (selectedRepoMeta?.defaultBranch) return [selectedRepoMeta.defaultBranch];
    return ['main'];
  }, [githubBranches, selectedRepoMeta?.defaultBranch]);
  const pendingDiffs = useMemo(
    () =>
      githubPendingChanges.map((change, index) => ({
        id: `${change.path}-${index}`,
        change,
        preview: buildDiffPreview(change),
      })),
    [githubPendingChanges]
  );
  const mentionQuery = useMemo(() => getMentionQuery(input), [input]);
  const availableReferences = useMemo(() => {
    if (mentionQuery === null) return [];
    return REFERENCE_OPTIONS.filter(
      (reference) =>
        !selectedReferences.includes(reference.id) &&
        reference.label.slice(1).toLowerCase().includes(mentionQuery)
    );
  }, [mentionQuery, selectedReferences]);
  const selectedReferenceItems = useMemo(
    () => REFERENCE_OPTIONS.filter((reference) => selectedReferences.includes(reference.id)),
    [selectedReferences]
  );

  const submitPrompt = useCallback(
    (submission: QueuedSubmission) => {
      void onSend(submission.prompt, { responseMode: submission.mode });
    },
    [onSend]
  );

  const enqueueOrSubmit = useCallback(
    (submission: QueuedSubmission) => {
      if (isGenerating) {
        setQueuedSubmissions((prev) => [...prev, submission]);
        return;
      }
      submitPrompt(submission);
    },
    [isGenerating, submitPrompt]
  );

  const applyActionPrompt = useCallback((prompt: string) => {
    setBuilderMode('build');
    setInput(prompt);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    if (githubOpen && githubConnection.connected && githubRepositories.length === 0) {
      void onLoadGitHubRepositories();
    }
  }, [githubConnection.connected, githubOpen, githubRepositories.length, onLoadGitHubRepositories]);

  useEffect(() => {
    if (githubOpen && githubRepoSession) {
      void onRefreshGitHubCommitHistory(githubRepoSession.fullName, githubRepoSession.branch);
    }
  }, [githubOpen, githubRepoSession, onRefreshGitHubCommitHistory]);

  useEffect(() => {
    if (!githubRepoSession) return;
    setSelectedRepo(githubRepoSession.fullName);
    setSelectedBranch(githubRepoSession.branch);
    setPrBranchName(`mvp/${Date.now()}`);
  }, [githubRepoSession]);

  useEffect(() => {
    if (selectedRepo || githubRepositories.length === 0) return;
    const first = githubRepositories[0];
    setSelectedRepo(first.fullName);
    setSelectedBranch(first.defaultBranch || 'main');
  }, [githubRepositories, selectedRepo]);

  useEffect(() => {
    if (!selectedRepo) return;
    void onLoadGitHubBranches(selectedRepo);
  }, [onLoadGitHubBranches, selectedRepo]);

  useEffect(() => {
    if (suggestedGitHubCommitMessage) {
      setCommitMessage(suggestedGitHubCommitMessage);
    }
  }, [suggestedGitHubCommitMessage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const node = textareaRef.current;
    if (!node) return;
    node.style.height = '0px';
    const nextHeight = Math.min(node.scrollHeight, 140);
    node.style.height = `${Math.max(nextHeight, 52)}px`;
  }, [input]);

  useEffect(() => {
    if (!input.trim() || builderMode === 'chat') return;
    const id = window.setTimeout(() => {
      void onClassifyAction(input);
    }, 800);
    return () => window.clearTimeout(id);
  }, [builderMode, input, onClassifyAction]);

  useEffect(() => {
    if (!lastBuildChangeSummary) return;
    setChangeCards((prev) =>
      prev.some((card) => card.id === lastBuildChangeSummary.id)
        ? prev
        : [...prev, lastBuildChangeSummary]
    );
  }, [lastBuildChangeSummary]);

  useEffect(() => {
    const wasGenerating = previousGeneratingRef.current;

    if (wasGenerating && !isGenerating) {
      if (queuedSubmissions.length > 0) {
        const [nextSubmission, ...rest] = queuedSubmissions;
        setQueuedSubmissions(rest);
        window.setTimeout(() => submitPrompt(nextSubmission), 120);
      }
    }

    previousGeneratingRef.current = isGenerating;
  }, [isGenerating, queuedSubmissions, submitPrompt]);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isGitHubBusy) return;

    const promptWithReferences = selectedReferenceItems.length
      ? `${trimmed}\n\nReference context to incorporate:\n${selectedReferenceItems
          .map((reference) => `- ${reference.label}: ${reference.description}`)
          .join('\n')}`
      : trimmed;

    const submission: QueuedSubmission = {
      id: crypto.randomUUID(),
      prompt: promptWithReferences,
      mode: builderMode,
    };

    if (isGenerating) {
      setQueuedSubmissions((prev) => [...prev, submission]);
      setInput('');
      return;
    }

    enqueueOrSubmit(submission);
    setInput('');
  }, [builderMode, enqueueOrSubmit, input, isGenerating, isGitHubBusy, selectedReferenceItems]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleRestorePrompt = (prompt: string) => {
    setInput(prompt);
    setHistoryOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleReusePrompt = (prompt: string) => {
    if (isGitHubBusy) return;
    const submission: QueuedSubmission = {
      id: crypto.randomUUID(),
      prompt,
      mode: builderMode,
    };
    enqueueOrSubmit(submission);
    setHistoryOpen(false);
  };

  const handleSelectReference = (referenceId: BuilderReferenceId) => {
    setSelectedReferences((prev) =>
      prev.includes(referenceId) ? prev : [...prev, referenceId]
    );
    setInput((prev) => stripTrailingMention(prev));
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const handleRemoveReference = (referenceId: BuilderReferenceId) => {
    setSelectedReferences((prev) => prev.filter((id) => id !== referenceId));
  };

  const toggleModel = (modelId: string) => {
    const isSelected = selectedModels.includes(modelId);
    const next = isSelected
      ? selectedModels.filter((id) => id !== modelId)
      : [...selectedModels, modelId];
    onSelectedModelsChange(next);
  };

  const setSingleModel = (modelId: string) => {
    onSelectedModelsChange([modelId]);
  };

  const handleRepoChange = (fullName: string) => {
    setSelectedRepo(fullName);
    setSelectedBranch('main');
  };

  const handleImportRepository = async () => {
    if (!selectedRepo) return;
    await onImportGitHubRepository(selectedRepo, 'main');
  };

  const handleCommitToBranch = async () => {
    if (!githubRepoSession) return;
    await onCommitGitHubChanges({
      createPullRequest: false,
      targetBranch: 'main',
      commitMessage: commitMessage || undefined,
    });
  };

  const handleCreatePullRequest = async () => {
    await handleCommitToBranch();
  };

  const handleRollback = async (sha: string) => {
    const ok = window.confirm(
      `Create a rollback commit to ${sha.slice(0, 8)} on ${githubRepoSession?.branch ?? 'current branch'}?`
    );
    if (!ok) return;
    await onRollbackGitHubCommit(sha);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background text-muted-foreground">
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4">
          {isEmpty ? (
            <div className="flex flex-col gap-5 py-6">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-info/20 bg-white/[0.04]">
                <Wand2 className="h-5 w-5 text-info" />
              </div>
              <div className="space-y-2">
                <h2 className="text-base font-semibold text-white">Ready to build</h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Your context is already loaded — target market, pain points, and positioning pulled from your dashboard and onboarding quiz. Just describe what you want to build.
                </p>
              </div>
              <div className="rounded-lg border border-info/10 bg-info/5 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                Tip: type{' '}
                <span className="font-medium text-info">@icp-profile</span>,{' '}
                <span className="font-medium text-info">@pmf-score</span>, or{' '}
                <span className="font-medium text-info">@brand-kit</span>{' '}
                in your prompt to anchor the build to specific context.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {projectVersions.length > 0 && (
                <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-label text-muted-foreground">
                  <span>Version history</span>
                  <Badge variant="outline" className="border-white/10 text-muted-foreground">
                    v{projectVersions[0]?.version_number ?? projectVersions.length}
                  </Badge>
                </div>
              )}
              {messages.map((msg) => (
                <MVPMessageItem key={msg.id} message={msg} />
              ))}
              {changeCards.map((card) => {
                const isExpanded = Boolean(expandedChangeCards[card.id]);
                return (
                  <div
                    key={card.id}
                    className="rounded-3xl border border-info/14 bg-[linear-gradient(180deg,rgba(56,189,248,0.08),rgba(255,255,255,0.03))] p-4 shadow-overlay"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-label font-semibold uppercase tracking-[0.22em] text-info/75">
                          Build change summary
                        </p>
                        <p className="mt-1 text-sm font-medium text-white">
                          {card.updatedSections} sections updated · {card.addedComponents} components added
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="pill-sm"
                        className="gap-1 border border-white/10 font-medium text-muted-foreground hover:bg-white/[0.05] hover:text-white"
                        onClick={() =>
                          setExpandedChangeCards((prev) => ({
                            ...prev,
                            [card.id]: !prev[card.id],
                          }))
                        }
                      >
                        View changes
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                    {isExpanded && (
                      <div className="mt-3 space-y-2">
                        {card.details.map((detail) => (
                          <div
                            key={detail.id}
                            className="rounded-2xl border border-white/8 bg-card px-3 py-2.5 text-sm text-muted-foreground"
                          >
                            {detail.type === 'updated' && detail.from && detail.to && (
                              <span>
                                {detail.from} {'->'} {detail.to}
                              </span>
                            )}
                            {detail.type === 'added' && detail.to && <span>Added {detail.to}</span>}
                            {detail.type === 'removed' && detail.from && <span>Removed {detail.from}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="shrink-0 border-t border-white/6 bg-gradient-to-b from-background/20 to-background/95 px-4 pb-4 pt-3">
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl backdrop-blur-xl transition-all duration-200 focus-within:border-info/25 focus-within:bg-white/[0.06]">
          {queuedSubmissions.length > 0 && (
            <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-warning/20 bg-warning/10 px-3 py-2 text-xs text-warning">
              <span>
                {queuedSubmissions.length} message{queuedSubmissions.length > 1 ? 's' : ''} queued
                {' '}— processing...
              </span>
              <button
                type="button"
                className="rounded-full border border-warning/20 p-1 text-warning hover:bg-warning-subtle"
                onClick={() => setQueuedSubmissions((prev) => prev.slice(0, -1))}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center gap-2 text-label text-muted-foreground">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setModelsOpen(true)}
              className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white"
            >
              <Bot className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setGithubOpen(true)}
              className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white"
            >
              <Github className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setHistoryOpen(true)}
              className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white"
            >
              <Clock3 className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                setInput((prev) => `${prev}${prev && !prev.endsWith(' ') ? ' ' : ''}@`);
                requestAnimationFrame(() => textareaRef.current?.focus());
              }}
              className="border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white"
            >
              <AtSign className="h-3.5 w-3.5" />
            </Button>
            <div className="ml-auto flex items-center gap-2 text-label text-muted-foreground">
              <span>{selectedModelLabels[0]}</span>
              <span>·</span>
              <span>{githubConnection.connected ? 'Repo linked' : 'No repo linked'}</span>
            </div>
          </div>

          {selectedReferenceItems.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {selectedReferenceItems.map((reference) => (
                <span
                  key={reference.id}
                  className="inline-flex items-center gap-2 rounded-full border border-info/20 bg-info/10 px-3 py-1 text-xs text-info"
                >
                  {reference.label}
                  <button
                    type="button"
                    className="rounded-full p-0.5 text-info/80 hover:bg-info-subtle hover:text-white"
                    onClick={() => handleRemoveReference(reference.id)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {builderMode === 'build' && (
            <div className="mb-3 grid grid-cols-4 gap-1.5">
              {[
                {
                  label: 'Add Page',
                  prompt: 'Add a new page/screen that fits the current app and wire it into the navigation.',
                  Icon: FilePlus2,
                },
                {
                  label: 'Add Feature',
                  prompt: 'Add a useful frontend feature with realistic state, empty states, and polished interactions.',
                  Icon: Sparkles,
                },
                {
                  label: 'Fix Bug',
                  prompt: 'Find and fix the current runtime or UX bug while preserving the app design.',
                  Icon: Bug,
                },
                {
                  label: 'Redesign',
                  prompt: 'Apply a cohesive design overhaul without changing the app functionality.',
                  Icon: Palette,
                },
              ].map(({ label, prompt, Icon }) => (
                <Button
                  key={label}
                  type="button"
                  variant="ghost"
                  size="pill-sm"
                  onClick={() => applyActionPrompt(prompt)}
                  className="h-8 min-w-0 rounded-lg border border-info/20 bg-white/[0.06] px-1.5 text-[10px] font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all hover:border-info/45 hover:bg-info/15 hover:text-white"
                >
                  <Icon className="h-3 w-3 text-info" />
                  <span className="min-w-0 truncate">{label}</span>
                </Button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-3">
            <div className="relative flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  builderMode === 'chat'
                    ? 'Ask for product direction, UX decisions, or implementation advice...'
                    : isEmpty
                    ? 'Describe your MVP idea, core flow, and visual style...'
                    : githubRepoSession
                    ? 'Describe the repository change to implement...'
                    : 'Describe the next change to make...'
                }
                className={cn(
                  'min-h-[52px] resize-none border-0 bg-transparent px-0 py-0 text-sm leading-relaxed text-white placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none',
                  isGenerating && 'text-muted-foreground'
                )}
                disabled={isGitHubBusy}
              />
              {availableReferences.length > 0 && (
                <div className="absolute bottom-[calc(100%+12px)] left-0 z-20 w-[280px] rounded-2xl border border-white/10 bg-card p-2 shadow-2xl">
                  {availableReferences.map((reference) => (
                    <button
                      key={reference.id}
                      type="button"
                      onClick={() => handleSelectReference(reference.id)}
                      className="flex w-full items-start gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/[0.05]"
                    >
                      <span className="mt-0.5 rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-caption font-semibold text-info">
                        {reference.label}
                      </span>
                      <span className="text-xs leading-relaxed text-muted-foreground">
                        {reference.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {isGenerating ? (
              <Button
                onClick={onCancelGeneration}
                type="button"
                className="h-11 shrink-0 rounded-2xl border border-destructive/25 bg-destructive/15 px-4 text-destructive hover:bg-destructive/20"
              >
                <Square className="mr-2 h-4 w-4 fill-current" />
                Stop
              </Button>
            ) : (
              <Button
                onClick={handleSend}
                disabled={!input.trim() || isGitHubBusy}
                className="h-11 shrink-0 rounded-2xl bg-white px-4 text-foreground shadow-sm transition-transform hover:scale-[1.03] hover:bg-muted disabled:bg-white/10 disabled:text-muted-foreground"
              >
                <Send className="mr-2 h-4 w-4" />
                {builderMode === 'chat' ? 'Ask' : 'Build'}
              </Button>
            )}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 px-1">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-card p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            {(['chat', 'build'] as MVPBuilderResponseMode[]).map((mode) => (
              <Button
                key={mode}
                type="button"
                variant="ghost"
                size="pill-sm"
                onClick={() => setBuilderMode(mode)}
                className={cn(
                  'px-3.5 text-xs font-semibold transition-all duration-150',
                  builderMode === mode
                    ? 'bg-info text-white shadow-sm hover:bg-info hover:text-white'
                    : 'text-white/85 hover:bg-white/[0.06] hover:text-white'
                )}
              >
                {mode === 'chat' ? 'Chat' : 'Build'}
              </Button>
            ))}
          </div>
          <div className="text-label text-muted-foreground">
            {builderMode === 'chat' ? 'Text-only planning' : 'Generates and renders'}
          </div>
          {builderMode === 'build' && lastActionQuote && (
            <div className="mt-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-label text-muted-foreground">
              {lastActionQuote.actionType === 'unsupported'
                ? 'Phase 2 supports frontend app generation, edits, bug fixes, add-page, add-feature, and redesign.'
                : lastActionQuote.actionType === 'unclear'
                ? 'Keep typing to preview the action cost.'
                : `${MVP_BUILDER_ACTION_LABELS[lastActionQuote.actionType]} - ${lastActionQuote.creditCost} credits`}
            </div>
          )}
          <Link
            to="/pricing#credit-packs"
            className="text-label font-medium text-info hover:text-info"
          >
            Buy credits
          </Link>
        </div>
      </div>

      <Sheet open={modelsOpen} onOpenChange={setModelsOpen}>
        <SheetContent side="right" className="w-[95vw] sm:max-w-lg p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className="px-4 py-4 border-b border-border/50">
              <SheetTitle className="text-base">Model Router</SheetTitle>
              <SheetDescription>
                Choose one model or combine multiple models. First selected model is the primary generator.
              </SheetDescription>
            </SheetHeader>

            <div className="px-4 py-2 border-b border-border/50 flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Active combination: <span className="text-foreground">{selectedModelLabels.join(' + ')}</span>
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => onSelectedModelsChange([MVP_DEFAULT_MODEL])}
              >
                Reset Default
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {MVP_MODEL_OPTIONS.map((model) => {
                  const isSelected = selectedModels.includes(model.id);
                  const isDefault = model.id === MVP_DEFAULT_MODEL;
                  return (
                    <div
                      key={model.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleModel(model.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          toggleModel(model.id);
                        }
                      }}
                      className={`w-full text-left rounded-xl border p-3 transition-colors ${
                        isSelected
                          ? 'border-primary/50 bg-primary/10'
                          : 'border-border/60 bg-card/60 hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">
                            {model.label}
                          </p>
                          <p className="text-xs text-muted-foreground">{model.description}</p>
                          <p className="text-label text-muted-foreground/90">
                            Best for: {model.bestFor}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {isDefault && (
                            <span className="text-caption rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-primary">
                              Default
                            </span>
                          )}
                          <span
                            className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                              isSelected
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border bg-background'
                            }`}
                          >
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </span>
                        </div>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 text-label"
                          onClick={(event) => {
                            event.stopPropagation();
                            setSingleModel(model.id);
                          }}
                        >
                          Use Only This
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={githubOpen} onOpenChange={setGithubOpen}>
        <SheetContent side="right" className="w-[98vw] sm:max-w-2xl p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className="px-4 py-4 border-b border-border/50">
              <SheetTitle className="text-base">GitHub Integration</SheetTitle>
              <SheetDescription>
                Connect your GitHub account, import a repository/branch, preview file diffs, then commit/push or open a Pull Request.
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                <div className="rounded-xl border border-border/60 bg-card/70 p-3 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Connection</p>
                      {githubConnection.connected ? (
                        <p className="text-xs text-muted-foreground">
                          Connected as @{githubConnection.profile?.login ?? 'github-user'}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Connect GitHub to import repositories into the MVP Builder.
                        </p>
                      )}
                    </div>
                    {githubConnection.connected ? (
                      <Badge variant="secondary">Connected</Badge>
                    ) : (
                      <Badge variant="outline">Not connected</Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {githubConnection.connected ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs"
                        onClick={onDisconnectGitHub}
                        disabled={isGitHubBusy}
                      >
                        {isGitHubBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Github className="h-3.5 w-3.5" />
                        )}
                        Disconnect GitHub
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={onConnectGitHub}
                        disabled={isGitHubBusy}
                      >
                        {isGitHubBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Github className="h-3.5 w-3.5" />
                        )}
                        Connect GitHub
                      </Button>
                    )}
                  </div>
                </div>

                {githubConnection.connected && (
                  <>
                    <div className="rounded-xl border border-border/60 bg-card/70 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Import Repository</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={onLoadGitHubRepositories}
                          disabled={isGitHubBusy}
                        >
                          {isGitHubBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Refresh repos
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <label className="space-y-1.5">
                          <span className="text-label uppercase tracking-wide text-muted-foreground">
                            Repository
                          </span>
                          <select
                            value={selectedRepo}
                            onChange={(event) => handleRepoChange(event.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            disabled={isGitHubBusy}
                          >
                            <option value="">Select repository</option>
                            {githubRepositories.map((repo) => (
                              <option key={repo.id} value={repo.fullName}>
                                {repo.fullName}
                              </option>
                            ))}
                          </select>
                        </label>

                        <label className="space-y-1.5">
                          <span className="text-label uppercase tracking-wide text-muted-foreground">
                            Branch (locked)
                          </span>
                          <select
                            value={selectedBranch}
                            onChange={(event) => setSelectedBranch(event.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            disabled
                          >
                            {availableBranches.map((branch) => (
                              <option key={branch} value={branch}>
                                {branch}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={handleImportRepository}
                          disabled={!selectedRepo || isGitHubBusy}
                        >
                          {isGitHubBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <GitBranch className="h-3.5 w-3.5" />
                          )}
                          Import Repository
                        </Button>
                      </div>

                      {githubRepoSession && (
                        <div className="rounded-md border border-border/50 bg-background/70 p-2.5 text-xs space-y-1">
                          <p className="text-foreground">
                            Active repo: <span className="font-medium">{githubRepoSession.fullName}</span>
                          </p>
                          <p className="text-muted-foreground">
                            Branch: {githubRepoSession.branch} · Files imported: {githubRepoSession.files.length}
                          </p>
                          {githubRepoSession.htmlUrl && (
                            <a
                              href={githubRepoSession.htmlUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:underline"
                            >
                              Open repository
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-border/60 bg-card/70 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Pending File Diff Preview</p>
                        <Badge variant="outline">{githubPendingChanges.length} files</Badge>
                      </div>

                      {pendingDiffs.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                          No pending code changes. Submit a prompt while a repository is imported to generate a diff preview.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {pendingDiffs.map(({ id, change, preview }) => (
                            <div key={id} className="rounded-md border border-border/50 bg-background/70 p-2.5 space-y-2">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      change.action === 'create' && 'border-success text-success',
                                      change.action === 'update' && 'border-warning text-warning',
                                      change.action === 'delete' && 'border-destructive text-destructive'
                                    )}
                                  >
                                    {change.action.toUpperCase()}
                                  </Badge>
                                  <code className="text-xs bg-muted/60 px-1.5 py-0.5 rounded">
                                    {change.path}
                                  </code>
                                </div>
                                {change.reason && (
                                  <span className="text-label text-muted-foreground">{change.reason}</span>
                                )}
                              </div>

                              <div className="rounded-md border border-border/50 overflow-hidden">
                                <div className="grid grid-cols-[58px_58px_auto] gap-2 px-2 py-1 text-caption uppercase tracking-wide text-muted-foreground bg-muted/40 border-b border-border/40">
                                  <span>Old</span>
                                  <span>New</span>
                                  <span>Content</span>
                                </div>
                                <ScrollArea className="max-h-56">
                                  <div className="font-mono text-label">
                                    {preview.lines.map((line, lineIndex) => (
                                      <div
                                        key={`${id}-${lineIndex}`}
                                        className={cn(
                                          'grid grid-cols-[58px_58px_auto] gap-2 px-2 py-0.5 border-b border-border/20 last:border-b-0',
                                          line.type === 'add' && 'bg-success/10',
                                          line.type === 'remove' && 'bg-destructive/10'
                                        )}
                                      >
                                        <span className="text-muted-foreground/80 text-right pr-1">
                                          {formatLineNumber(line.oldLine)}
                                        </span>
                                        <span className="text-muted-foreground/80 text-right pr-1">
                                          {formatLineNumber(line.newLine)}
                                        </span>
                                        <span className="whitespace-pre-wrap break-all">
                                          {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
                                          {line.text || ' '}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </ScrollArea>
                                {preview.truncated && (
                                  <p className="px-2 py-1 text-caption text-muted-foreground border-t border-border/40 bg-muted/30">
                                    Diff preview truncated for performance.
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-xl border border-border/60 bg-card/70 p-3 space-y-3">
                      <p className="text-sm font-medium">Commit / Push to main</p>

                      <label className="space-y-1.5 block">
                        <span className="text-label uppercase tracking-wide text-muted-foreground">
                          Commit message
                        </span>
                        <Textarea
                          value={commitMessage}
                          onChange={(event) => setCommitMessage(event.target.value)}
                          placeholder="Describe this repository update..."
                          className="min-h-[74px] text-sm"
                          disabled={isGitHubBusy}
                        />
                      </label>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={handleCommitToBranch}
                          disabled={!githubRepoSession || githubPendingChanges.length === 0 || isGitHubBusy}
                        >
                          {isGitHubBusy ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <GitCommitHorizontal className="h-3.5 w-3.5" />
                          )}
                          Commit + Push
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={onDiscardGitHubChanges}
                          disabled={githubPendingChanges.length === 0 || isGitHubBusy}
                        >
                          Discard Pending
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                        <input
                          value={prBranchName}
                          onChange={(event) => setPrBranchName(event.target.value)}
                          placeholder="main branch push; PR mode is disabled in v1"
                          className="h-8 rounded-md border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          disabled
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8 text-xs"
                          onClick={handleCreatePullRequest}
                          disabled={
                            !githubRepoSession ||
                            githubPendingChanges.length === 0 ||
                            isGitHubBusy
                          }
                        >
                          Push to main
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border/60 bg-card/70 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">Recent GitHub Commits</p>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs"
                          onClick={() =>
                            onRefreshGitHubCommitHistory(
                              githubRepoSession?.fullName,
                              githubRepoSession?.branch
                            )
                          }
                          disabled={!githubRepoSession || isGitHubBusy}
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                          Refresh
                        </Button>
                      </div>

                      {githubCommitHistory.length === 0 ? (
                        <div className="rounded-md border border-dashed border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
                          No commits loaded for this branch yet.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {githubCommitHistory.map((commit) => (
                            <div key={commit.sha} className="rounded-md border border-border/50 bg-background/70 p-2.5 space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{commit.message}</p>
                                  <p className="text-label text-muted-foreground truncate">
                                    {commit.shortSha} · {formatDateTime(commit.committedAt)}
                                    {commit.author ? ` · ${commit.author}` : ''}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {commit.url && (
                                    <a
                                      href={commit.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-label hover:bg-muted"
                                    >
                                      Open
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-label"
                                    onClick={() => handleRollback(commit.sha)}
                                    disabled={isGitHubBusy}
                                  >
                                    <Undo2 className="h-3.5 w-3.5" />
                                    Rollback
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="right" className="w-[95vw] sm:max-w-md p-0">
          <div className="flex h-full flex-col">
            <SheetHeader className="px-4 py-4 border-b border-border/50">
              <SheetTitle className="text-base">Prompt Log</SheetTitle>
              <SheetDescription>
                Most recent first. This tracks prompt activity and linked GitHub commits. Code snapshots live in the Code tab.
              </SheetDescription>
            </SheetHeader>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-3">
                {sortedHistory.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-xs text-muted-foreground">
                    No prompts yet. Generate or refine your MVP to start the prompt log.
                  </div>
                ) : (
                  sortedHistory.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/60 bg-card/60 p-3 space-y-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-label text-muted-foreground">
                          <Clock3 className="h-3.5 w-3.5" />
                          {formatDateTime(item.committedAt)}
                        </div>
                        {item.branch && (
                          <p className="text-label text-muted-foreground">
                            Branch: <span className="font-mono">{item.branch}</span>
                          </p>
                        )}
                        {item.commitRef && (
                          <p className="text-label text-muted-foreground">
                            Ref: <span className="font-mono">{item.commitRef}</span>
                          </p>
                        )}
                        {(item.commitUrl || item.pullRequestUrl) && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {item.commitUrl && (
                              <a
                                href={item.commitUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-label text-primary hover:underline"
                              >
                                GitHub commit
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                            {item.pullRequestUrl && (
                              <a
                                href={item.pullRequestUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-label text-primary hover:underline"
                              >
                                Pull request
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="rounded-md border border-border/50 bg-background/70 p-2 max-h-36 overflow-y-auto">
                        <p className="text-xs whitespace-pre-wrap break-words text-foreground/90">
                          {item.prompt}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleRestorePrompt(item.prompt)}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1" />
                          Restore
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => handleReusePrompt(item.prompt)}
                          disabled={isGenerating || isGitHubBusy}
                        >
                          <Send className="h-3.5 w-3.5 mr-1" />
                          Reuse
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};
