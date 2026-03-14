import React, { useState } from 'react';
import { useMVPBuilder } from '@/hooks/useMVPBuilder';
import { MVPBuilderHeader } from './MVPBuilderHeader';
import { MVPBuilderChat } from './MVPBuilderChat';
import { MVPBuilderPreview } from './MVPBuilderPreview';
import { MessageSquare, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';

type MobileTab = 'chat' | 'preview';

export const MVPBuilder: React.FC = () => {
  const {
    messages,
    projectFiles,
    entryFilePath,
    previewState,
    selectedCodeFilePath,
    codeChanges,
    isShowingPreviewFallback,
    lastGeneratedProject,
    selectedProjectType,
    projectSummary,
    projectDependencies,
    projectSnapshots,
    currentHtml,
    isGenerating,
    projectName,
    projectId,
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
    resetProject,
    connectGitHub,
    disconnectGitHub,
    loadGitHubRepositories,
    loadGitHubBranches,
    importGitHubRepository,
    discardGitHubChanges,
    commitGitHubChanges,
    rollbackGitHubCommit,
    loadGitHubCommitHistory,
  } =
    useMVPBuilder();

  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      {/* Header spans full width */}
      <MVPBuilderHeader
        projectName={projectName}
        setProjectName={setProjectName}
        selectedModels={selectedModels}
        onNewProject={resetProject}
      />

      {/* Desktop: side-by-side split. Mobile: tabs */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Mobile tab bar — pill style */}
        <div className="flex md:hidden items-center justify-center border-b border-border/40 bg-background shrink-0 py-1.5">
          <div className="flex items-center bg-muted rounded-full p-0.5">
            <button
              className={cn(
                'flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-medium transition-all duration-200',
                mobileTab === 'chat'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setMobileTab('chat')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </button>
            <button
              className={cn(
                'flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-medium transition-all duration-200',
                mobileTab === 'preview'
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setMobileTab('preview')}
            >
              <Monitor className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>
        </div>

        {/* Split pane — gradient divider on desktop */}
        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[38%_1px_auto]">
          {/* Chat panel */}
          <div
            className={cn(
              'min-h-0',
              mobileTab !== 'chat' ? 'hidden md:block' : 'block'
            )}
          >
            <MVPBuilderChat
              messages={messages}
              promptHistory={promptHistory}
              selectedModels={selectedModels}
              selectedProjectType={selectedProjectType}
              githubConnection={githubConnection}
              githubRepositories={githubRepositories}
              githubBranches={githubBranches}
              githubRepoSession={githubRepoSession}
              githubPendingChanges={githubPendingChanges}
              githubCommitHistory={githubCommitHistory}
              isGitHubBusy={isGitHubBusy}
              suggestedGitHubCommitMessage={suggestedGitHubCommitMessage}
              onSelectedModelsChange={setSelectedModels}
              onProjectTypeChange={setSelectedProjectType}
              onSend={sendMessage}
              onConnectGitHub={connectGitHub}
              onDisconnectGitHub={disconnectGitHub}
              onLoadGitHubRepositories={loadGitHubRepositories}
              onLoadGitHubBranches={loadGitHubBranches}
              onImportGitHubRepository={importGitHubRepository}
              onDiscardGitHubChanges={discardGitHubChanges}
              onCommitGitHubChanges={commitGitHubChanges}
              onRollbackGitHubCommit={rollbackGitHubCommit}
              onRefreshGitHubCommitHistory={loadGitHubCommitHistory}
              isGenerating={isGenerating}
            />
          </div>

          {/* Gradient vertical divider (desktop only) */}
          <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-border/60 to-transparent self-stretch" />

          {/* Preview panel */}
          <div
            className={cn(
              'min-h-0',
              mobileTab !== 'preview' ? 'hidden md:block' : 'block'
            )}
          >
            <MVPBuilderPreview
              html={currentHtml}
              isGenerating={isGenerating}
              projectId={projectId}
              projectFiles={projectFiles}
              baselineFiles={lastGeneratedProject?.files ?? []}
              projectType={selectedProjectType}
              projectSummary={projectSummary}
              projectDependencies={projectDependencies}
              projectSnapshots={projectSnapshots}
              previewState={previewState}
              entryFilePath={entryFilePath}
              selectedCodeFilePath={selectedCodeFilePath}
              codeChanges={codeChanges}
              isShowingPreviewFallback={isShowingPreviewFallback}
              onSelectCodeFile={setSelectedCodeFilePath}
              onSaveCodeFile={updateProjectFile}
              onResetCodeFile={resetProjectFile}
              onResetProjectCode={resetProjectCode}
              onCreateSnapshot={createManualSnapshot}
              onRestoreSnapshot={restoreProjectSnapshot}
              onSelectEntryFile={setEntryFilePath}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
