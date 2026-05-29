import React, { useState } from 'react';
import { useMVPBuilder } from '@/hooks/useMVPBuilder';
import { MVPBuilderHeader } from './MVPBuilderHeader';
import { MVPBuilderChat } from './MVPBuilderChat';
import { MVPBuilderPreview } from './MVPBuilderPreview';
import { MessageSquare, Monitor } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

type MobileTab = 'chat' | 'preview';

export const MVPBuilder: React.FC = () => {
  const {
    messages,
    projectFiles,
    entryFilePath,
    projectFramework,
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
    lastBuildChangeSummary,
    projectName,
    projectId,
    promptHistory,
    selectedModels,
    setupInput,
    projectVersions,
    lastActionQuote,
    deploymentUrl,
    isDeploying,
    mvpCreditsAvailable,
    githubConnection,
    githubRepositories,
    githubBranches,
    githubRepoSession,
    githubPendingChanges,
    githubCommitHistory,
    isGitHubBusy,
    suggestedGitHubCommitMessage,
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
  } = useMVPBuilder();

  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const isMobile = useIsMobile();

  const chatPanel = (
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
      lastBuildChangeSummary={lastBuildChangeSummary}
      setupInput={setupInput}
      projectVersions={projectVersions}
      lastActionQuote={lastActionQuote}
      onSelectedModelsChange={setSelectedModels}
      onSetupInputChange={setSetupInput}
      onProjectTypeChange={setSelectedProjectType}
      onSend={sendMessage}
      onClassifyAction={classifyActionQuote}
      onCancelGeneration={cancelGeneration}
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
  );

  const previewPanel = (
    <MVPBuilderPreview
      html={currentHtml}
      isGenerating={isGenerating}
      projectId={projectId}
      projectFiles={projectFiles}
      baselineFiles={lastGeneratedProject?.files ?? []}
      projectFramework={projectFramework}
      projectType={selectedProjectType}
      projectSummary={projectSummary}
      projectDependencies={projectDependencies}
      projectSnapshots={projectSnapshots}
      deploymentUrl={deploymentUrl}
      isDeploying={isDeploying}
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
      onExportZip={exportProjectZip}
      onDeploy={deployProject}
    />
  );

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
      <MVPBuilderHeader
        projectName={projectName}
        setProjectName={setProjectName}
        selectedModels={selectedModels}
        mvpCreditsAvailable={mvpCreditsAvailable}
        onNewProject={resetProject}
      />

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex md:hidden items-center justify-center border-b border-border/40 bg-[#0b1020] shrink-0 py-2">
          <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <button
              className={cn(
                'flex items-center gap-1.5 px-4 py-1 rounded-full text-xs font-medium transition-all duration-200',
                mobileTab === 'chat'
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
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
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              )}
              onClick={() => setMobileTab('preview')}
            >
              <Monitor className="h-3.5 w-3.5" />
              Preview
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[32%_1px_minmax(0,1fr)]">
          {!isMobile && (
            <>
              <div className="min-h-0 border-r border-white/5 bg-[#0a0f1d] shadow-[20px_0_60px_rgba(0,0,0,0.25)]">
                {chatPanel}
              </div>

              <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-white/10 to-transparent self-stretch" />

              <div className="min-h-0">{previewPanel}</div>
            </>
          )}

          {isMobile && mobileTab === 'chat' && <div className="min-h-0">{chatPanel}</div>}

          {isMobile && mobileTab === 'preview' && (
            <div className="min-h-0">{previewPanel}</div>
          )}
        </div>
      </div>
    </div>
  );
};
