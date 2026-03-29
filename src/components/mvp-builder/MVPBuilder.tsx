import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Copy,
  FolderKanban,
  PencilLine,
  RotateCcw,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { useMVPBuilder, type MVPMessage } from '@/hooks/useMVPBuilder';
import { Button } from '@/components/ui/button';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { cn } from '@/lib/utils';
import { PromptInput } from './PromptInput';
import { PreviewPanel } from './PreviewPanel';
import { ProjectsDrawer } from './ProjectsDrawer';

type MobileTab = 'chat' | 'preview';

const SUGGESTIONS = [
  'Landing page for a SaaS',
  'Dashboard UI',
  'Mobile app login screen',
  'Waitlist page',
];

function formatMessageTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatSavedAt(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function StatusPill({
  status,
  lastSavedAt,
}: {
  status: 'idle' | 'generating' | 'saved' | 'unsaved';
  lastSavedAt: string | null;
}) {
  const label =
    status === 'generating'
      ? 'Building...'
      : status === 'unsaved'
      ? 'Unsaved changes'
      : status === 'saved'
      ? 'Saved'
      : 'Idle';

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out',
        status === 'generating' && 'border-amber-500/25 bg-amber-500/10 text-amber-700',
        status === 'unsaved' && 'border-sky-500/20 bg-sky-500/10 text-sky-700',
        status === 'saved' && 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700',
        status === 'idle' && 'border-border/70 bg-muted/35 text-muted-foreground'
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          status === 'generating' && 'bg-amber-500 animate-pulse',
          status === 'unsaved' && 'bg-sky-500',
          status === 'saved' && 'bg-emerald-500',
          status === 'idle' && 'bg-muted-foreground/60'
        )}
      />
      {label}
      {status === 'saved' && lastSavedAt && (
        <span className="text-[11px] text-emerald-700/80">{formatSavedAt(lastSavedAt)}</span>
      )}
    </div>
  );
}

function AssistantWelcome() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="mb-4 flex items-start gap-3"
    >
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="max-w-[92%] rounded-[24px] border border-border/60 bg-card/75 px-4 py-3 text-sm text-foreground">
        Hi! Tell me what you&apos;d like to build. Be as specific or as vague as you like —
        we&apos;ll figure it out together.
      </div>
    </motion.div>
  );
}

function MessageRow({
  message,
  canCopyCode,
  onCopyCode,
  onRerun,
  onRetry,
}: {
  message: MVPMessage;
  canCopyCode: boolean;
  onCopyCode: () => void;
  onRerun: (prompt: string) => void;
  onRetry: (prompt: string) => void;
}) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 12 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="mb-4 flex justify-end"
      >
        <div className="max-w-[88%] rounded-[24px] rounded-br-md bg-muted px-4 py-3 text-sm text-foreground shadow-sm">
          {message.content}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="mb-4 flex items-start gap-3"
    >
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
        <Sparkles className="h-4 w-4" />
      </div>

      <div
        className={cn(
          'max-w-[92%] rounded-[24px] border px-4 py-3 shadow-sm',
          message.type === 'error'
            ? 'border-red-500/25 bg-red-500/5'
            : 'border-border/60 bg-card/75'
        )}
      >
        {message.isStreaming && !message.content ? (
          <div className="flex items-center gap-1.5 py-1">
            <span className="h-2 w-2 rounded-full bg-primary/70 animate-bounce" />
            <span className="h-2 w-2 rounded-full bg-primary/55 animate-bounce [animation-delay:120ms]" />
            <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:240ms]" />
          </div>
        ) : (
          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
            {message.content}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          <span>{formatMessageTime(message.createdAt)}</span>
          {message.model && !message.isStreaming && <span>· {message.model}</span>}
          {message.type !== 'error' && message.linkedPrompt && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground"
              onClick={() => onRerun(message.linkedPrompt!)}
            >
              <RotateCcw className="h-3 w-3" />
              Re-run
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 transition-colors duration-150 ease-out hover:bg-muted hover:text-foreground disabled:opacity-40"
            onClick={onCopyCode}
            disabled={!canCopyCode}
          >
            <Copy className="h-3 w-3" />
            Copy code
          </button>
          {message.type === 'error' && message.retryPrompt && (
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-red-700 transition-colors duration-150 ease-out hover:bg-red-500/10"
              onClick={() => onRetry(message.retryPrompt!)}
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export const MVPBuilder: React.FC = () => {
  const {
    messages,
    projectFiles,
    entryFilePath,
    projectFramework,
    selectedProjectType,
    projectSummary,
    projectDependencies,
    currentHtml,
    generatedCode,
    selectedCodeFilePath,
    lastGeneratedProject,
    projectSnapshots,
    codeChanges,
    isGenerating,
    isSavingProject,
    saveStatus,
    projectName,
    projectId,
    lastSavedAt,
    savedProjects,
    isProjectsLoading,
    setProjectName,
    setSelectedCodeFilePath,
    setEntryFilePath,
    updateProjectFile,
    resetProjectFile,
    resetProjectCode,
    createManualSnapshot,
    restoreProjectSnapshot,
    sendMessage,
    cancelGeneration,
    saveProject,
    loadProject,
    loadProjects,
    deleteProject,
    resetProject,
  } = useMVPBuilder();

  const [draftPrompt, setDraftPrompt] = useState('');
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(projectName);
  const [manualSaveSuccess, setManualSaveSuccess] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTitleDraft(projectName);
  }, [projectName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const showFirstLoadSuggestions = messages.length === 0 && !generatedCode;
  const baselineFiles = lastGeneratedProject?.files ?? [];

  const handleSend = async () => {
    const prompt = draftPrompt.trim();
    if (!prompt) return;
    await sendMessage(prompt);
    setDraftPrompt('');
  };

  const handleCopyCode = async () => {
    if (!generatedCode) return;
    await navigator.clipboard.writeText(generatedCode);
  };

  const handleManualSave = async () => {
    const saved = await saveProject();
    if (!saved) return;
    setManualSaveSuccess(true);
    window.setTimeout(() => setManualSaveSuccess(false), 1400);
    void loadProjects();
  };

  const commitTitle = () => {
    const trimmed = titleDraft.trim();
    setProjectName(trimmed || 'Untitled Project');
    setIsEditingTitle(false);
  };

  const chatPanel = (
    <motion.section
      initial={{ opacity: 0, x: -18 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-[32px] border border-border/60 bg-background/92 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.75)]"
    >
        <div className="sticky top-0 z-20 border-b border-border/50 bg-background/92 px-4 py-4 backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 rounded-xl text-xs"
                  onClick={() => setProjectsOpen(true)}
                >
                  <FolderKanban className="mr-1.5 h-3.5 w-3.5" />
                  Projects
                </Button>
                <StatusPill status={saveStatus} lastSavedAt={lastSavedAt} />
              </div>

              <div className="mt-3">
                {isEditingTitle ? (
                  <input
                    value={titleDraft}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onBlur={commitTitle}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitTitle();
                      if (event.key === 'Escape') {
                        setTitleDraft(projectName);
                        setIsEditingTitle(false);
                      }
                    }}
                    className="w-full border-0 bg-transparent text-xl font-semibold text-foreground outline-none"
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(true)}
                    className="group inline-flex items-center gap-2 border-b border-transparent pb-0.5 text-left text-xl font-semibold text-foreground transition-colors duration-200 ease-out hover:border-border"
                  >
                    <span className="truncate">{projectName}</span>
                    <PencilLine className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-9 w-9 rounded-xl"
                onClick={() => window.alert('Share is coming next.')}
              >
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl text-xs"
                onClick={() => setConfirmResetOpen(true)}
              >
                Start fresh
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-9 rounded-xl text-xs"
                onClick={handleManualSave}
                disabled={isSavingProject}
              >
                {manualSaveSuccess ? (
                  <Check className="mr-1.5 h-3.5 w-3.5" />
                ) : null}
                Save
              </Button>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence initial={false}>
            {messages.length === 0 && <AssistantWelcome />}

            {showFirstLoadSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="mb-6 rounded-[28px] border border-border/60 bg-card/60 px-5 py-5"
              >
                <p className="text-base font-semibold text-foreground">
                  Start with a strong first prompt
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Mention the product, the core workflow, and any design direction you want.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {SUGGESTIONS.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setDraftPrompt(suggestion)}
                      className="rounded-full border border-border/70 bg-background px-3 py-1.5 text-xs text-muted-foreground transition-all duration-200 ease-out hover:border-primary/35 hover:bg-primary/8 hover:text-foreground"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {messages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                canCopyCode={Boolean(generatedCode)}
                onCopyCode={handleCopyCode}
                onRerun={(prompt) => void sendMessage(prompt)}
                onRetry={(prompt) => void sendMessage(prompt)}
              />
            ))}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border/50 px-4 py-4">
          <PromptInput
            value={draftPrompt}
            onChange={setDraftPrompt}
            onSend={() => void handleSend()}
            onCancel={cancelGeneration}
            isGenerating={isGenerating}
            placeholder={
              messages.length === 0
                ? 'Describe the product, flow, and feel you want...'
                : 'Describe the next change to make...'
            }
            suggestions={SUGGESTIONS}
            showSuggestions={showFirstLoadSuggestions}
            onSuggestionSelect={setDraftPrompt}
          />
        </div>

      <ProjectsDrawer
        open={projectsOpen}
        onClose={() => setProjectsOpen(false)}
        projects={savedProjects}
        isLoading={isProjectsLoading}
        activeProjectId={projectId}
        onLoad={loadProject}
        onDelete={deleteProject}
      />
    </motion.section>
  );

  const previewPanel = (
    <PreviewPanel
      html={currentHtml}
      generatedCode={generatedCode}
      isGenerating={isGenerating}
      projectFiles={projectFiles}
      baselineFiles={baselineFiles}
      projectFramework={projectFramework}
      projectType={selectedProjectType}
      projectSummary={projectSummary}
      projectDependencies={projectDependencies}
      projectSnapshots={projectSnapshots}
      selectedCodeFilePath={selectedCodeFilePath}
      entryFilePath={entryFilePath}
      codeChanges={codeChanges}
      onSelectCodeFile={setSelectedCodeFilePath}
      onSaveCodeFile={updateProjectFile}
      onResetCodeFile={resetProjectFile}
      onResetProjectCode={resetProjectCode}
      onCreateSnapshot={createManualSnapshot}
      onRestoreSnapshot={restoreProjectSnapshot}
      onSelectEntryFile={setEntryFilePath}
    />
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.3))] text-foreground">
      <div className="hidden h-full lg:block">
        <ResizablePanelGroup direction="horizontal" className="p-4">
          <ResizablePanel defaultSize={32} minSize={24}>
            {chatPanel}
          </ResizablePanel>
          <ResizableHandle
            withHandle
            className="mx-2 rounded-full bg-transparent before:absolute before:inset-y-4 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border"
          />
          <ResizablePanel defaultSize={68} minSize={40}>
            {previewPanel}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      <div className="hidden h-full flex-col gap-4 p-4 md:flex lg:hidden">
        <div className="min-h-0 flex-[1.08]">{previewPanel}</div>
        <div className="min-h-0 flex-1">{chatPanel}</div>
      </div>

      <div className="flex h-full flex-col md:hidden">
        <div className="border-b border-border/50 px-4 py-3">
          <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/80 p-1">
            <button
              type="button"
              onClick={() => setMobileTab('chat')}
              className={cn(
                'flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-out',
                mobileTab === 'chat'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              )}
            >
              Chat
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('preview')}
              className={cn(
                'flex-1 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-out',
                mobileTab === 'preview'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground'
              )}
            >
              Preview
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 p-3">
          {mobileTab === 'chat' ? chatPanel : previewPanel}
        </div>
      </div>

      <AnimatePresence>
        {confirmResetOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-50 bg-slate-950/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              onClick={() => setConfirmResetOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="fixed left-1/2 top-1/2 z-[60] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[30px] border border-border/60 bg-background px-6 py-6 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">Start fresh?</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    This clears the current chat, preview, and unsaved project state.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmResetOpen(false)}
                  className="rounded-full p-2 text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-6 flex items-center justify-end gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setConfirmResetOpen(false)}>
                  Cancel
                </Button>
                <Button
                  className="rounded-xl"
                  onClick={() => {
                    resetProject();
                    setConfirmResetOpen(false);
                  }}
                >
                  Start fresh
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
