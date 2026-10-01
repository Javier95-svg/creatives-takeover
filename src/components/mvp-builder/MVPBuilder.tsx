import { supabase } from '@/integrations/supabase/client';
import { MVPWorkflowPanel } from './MVPWorkflowPanel';
import { MVPBuildPlanner } from './MVPBuildPlanner';
import { MVPManagedSetup } from './MVPManagedSetup';
import { deriveCapabilities } from '../../../supabase/functions/_shared/mvp-capabilities';
import { buildBriefErrors, createBuildBrief } from '../../../supabase/functions/_shared/mvp-build-brief';
import { useMvpWorkflowTest } from '@/hooks/useMvpWorkflowTest';
import { workflowErrors, publicKeyError } from '../../../supabase/functions/_shared/mvp-workflow';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import React, { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useMVPBuilder } from '@/hooks/useMVPBuilder';
import { MVPBuilderHeader } from './MVPBuilderHeader';
import { MVPBuilderChat } from './MVPBuilderChat';
import { MVPBuilderPreview } from './MVPBuilderPreview';
import { MVPBuilderCreditExhaustedDialog } from './MVPBuilderCreditExhaustedDialog';
import { MVPBuilderLowCreditBanner } from './MVPBuilderLowCreditBanner';
import { MVPBuilderTopUpDialog } from './MVPBuilderTopUpDialog';

import { MessageSquare, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    currentPlan,
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
    publishProject,
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
    refreshGitHubConnection,
    saveSupabaseCredentials,
    refreshSupabaseConnection,
    closeCreditExhaustedModal,
    savedProjects,
    loadProject,
    deleteProject,
    saveProject,
    hasUnsavedChanges,
    isSavingProject,
    lastSavedAt,
  } = useMVPBuilder();

  const [incomingIdea,setIncomingIdea]=useState(()=>new URLSearchParams(window.location.search).get('idea')?.slice(0,4000) || '');
  const acceptIdea=async()=>{
    if(projectFiles.length && !await saveProject({silent:true})){toast.error('Save your current project before starting another.');return;}
    resetProject();
    setSetupInput({buildBrief:createBuildBrief(incomingIdea),customPrompt:incomingIdea});
    setIncomingIdea('');
    const url=new URL(window.location.href);url.searchParams.delete('idea');window.history.replaceState({},'',url.pathname+url.search+url.hash);
  };

  const draftIdentity=JSON.stringify([projectId,projectFiles,setupInput.buildBrief,setupInput.workflow,setupInput.workflowPublicKey,supabaseConnection.connectionId]);
  const tests=useMvpWorkflowTest(projectId,draftIdentity,()=>saveProject({silent:true}),isShowingPreviewFallback);
  const [consent,setConsent]=useState<{prompt:string;cost:number;repairKey?:string;identity:string}|null>(null);
  const [quoting,setQuoting]=useState(false);
  const quotedSend=async(prompt:string,options?:{responseMode?:'chat'|'build'},repairKey?:string)=>{
    if(options?.responseMode==='chat') return sendMessage(prompt,options);
    if(quoting || isGenerating)return;
    const brief=setupInput.buildBrief;
    if(!projectFiles.length && !brief && !setupInput.workflow){setSetupInput({buildBrief:createBuildBrief(prompt)});toast.info('Your idea is ready. Add who it is for, then review the plan and price.');return;}
    if(brief && buildBriefErrors(brief).length){toast.error(buildBriefErrors(brief)[0]);return;}
    if(!projectFiles.length && brief?.delivery!=='preview' && tests.available!==true){toast.error('Launch testing is offline. You can choose a preview/export build in your plan.');return;}
    if(!brief && !projectFiles.length && workflowErrors(setupInput.workflow).length){toast.error('Choose a starter and define the customer task first.');return;}
    if((setupInput.workflow || brief?.delivery==='connected') && !supabaseConnection.connected){toast.error('Connect the database for this workflow first.');return;}
    if((setupInput.workflow || brief?.delivery==='connected') && publicKeyError(setupInput.workflowPublicKey)){toast.error(publicKeyError(setupInput.workflowPublicKey)!);return;}
    setQuoting(true);
    try {const quote=await classifyActionQuote(prompt);if(quote && quote.actionType!=='unsupported' && quote.actionType!=='unclear')setConsent({prompt,cost:quote.creditCost,repairKey,identity:JSON.stringify([draftIdentity,selectedModels])});else toast.error('This request is outside the supported workflow scope.');}
    finally{setQuoting(false);}
  };
  const confirmBuild=async()=>{
    const next=consent;if(!next)return;setConsent(null);
    if(!projectFiles.length && setupInput.buildBrief?.delivery!=='preview' && tests.available!==true){toast.error('Workflow testing is offline. No credits were charged.');return;}
    if(next.identity!==JSON.stringify([draftIdentity,selectedModels])){toast.error("Scope or model changed. Review a new quote before building.");return;}
    if(projectFiles.length){createManualSnapshot(); if(!await saveProject({silent:true})){toast.error('Could not save the checkpoint. Retry before changing this app.');return;}}
    if(projectFiles.length){const {error}=await (supabase as any).rpc('mvp_edit_checkpoint',{p_project_id:projectId,p_restore:false});if(error){toast.error('Could not create the recovery checkpoint. Nothing was changed.');return;}}
    if(next.repairKey)autoFixAttemptsRef.current.set(next.repairKey,(autoFixAttemptsRef.current.get(next.repairKey)??0)+1);
    await sendMessage(next.prompt,{responseMode:'build'});
  };
  const publishTested=()=>{if(!tests.testRunId){toast.error('Save and test this revision before publishing.');return;}void publishProject(tests.testRunId);};
  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [topUpsOpen, setTopUpsOpen] = useState(false);
  const isMobile = useIsMobile();
  // Bounded auto-fix: each distinct runtime error gets at most two automatic
  // debug rounds. Each attempt opens a price confirmation; the cap stops error loops
  // from draining the balance.
  const autoFixAttemptsRef = useRef<Map<string, number>>(new Map());
  useEffect(()=>{autoFixAttemptsRef.current.clear();},[projectId]);
  const handleAutoFix = (error: string) => {
    const signature = error.trim().slice(0, 160);
    const attempts = autoFixAttemptsRef.current.get(signature) ?? 0;
    if (attempts >= 2) {
      toast.info('Auto-fix already tried twice for this error.', {
        description: 'Describe what you expected in the chat so the builder gets more context.',
      });
      return;
    }
    void quotedSend(
      `Fix this runtime error without changing the app's design or unrelated behavior. Error (attempt ${attempts + 1} of 2):\n\n${error.trim().slice(0, 1200)}`,
      { responseMode: 'build' }, signature,
    );
  };

  const handleDeleteProject = async (id: string) => {
    const deleted = await deleteProject(id);
    if (deleted && id === projectId) {
      resetProject();
    }
    return deleted;
  };

  const chatPanel = (
    <MVPBuilderChat
      messages={messages}
      promptHistory={promptHistory}
      selectedModels={selectedModels}
      currentPlan={currentPlan}
      selectedProjectType={selectedProjectType}
      githubConnection={githubConnection}
      githubRepositories={githubRepositories}
      githubBranches={githubBranches}
      githubRepoSession={githubRepoSession}
      githubPendingChanges={githubPendingChanges}
      githubCommitHistory={githubCommitHistory}
      isGitHubBusy={isGitHubBusy}
      suggestedGitHubCommitMessage={suggestedGitHubCommitMessage}
      integrationReady={integrationReady}
      lastBuildChangeSummary={lastBuildChangeSummary}
      setupInput={setupInput}
      projectVersions={projectVersions}
      lastActionQuote={lastActionQuote}
      onSelectedModelsChange={setSelectedModels}
      onSetupInputChange={setSetupInput}
      onProjectTypeChange={setSelectedProjectType}
      onSend={quotedSend}
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
      onBuyCredits={() => setTopUpsOpen(true)}
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
      onDeploy={publishTested}
      onAutoFix={handleAutoFix}
      integrations={integrations}
      githubConnection={githubConnection}
      githubRepositories={githubRepositories}
      githubRepoSession={githubRepoSession}
      isGitHubBusy={isGitHubBusy}
      supabaseConnection={supabaseConnection}
      supabaseProjects={[]}
      isSupabaseBusy={isSupabaseBusy}
      onConnectGitHub={connectGitHub}
      onLoadGitHubRepositories={loadGitHubRepositories}
      onImportGitHubRepository={importGitHubRepository}
      onSaveSupabaseCredentials={saveSupabaseCredentials}
      onRefreshGitHub={refreshGitHubConnection}
      onRefreshSupabase={refreshSupabaseConnection}
    />
  );

  return (
    <div className="dark mvp-surface h-screen w-screen flex flex-col overflow-hidden bg-background">
      <MVPBuilderHeader
        projectName={projectName}
        setProjectName={setProjectName}
        selectedModels={selectedModels}
        creditsAvailable={creditsAvailable}
        integrations={integrations}
        onNewProject={resetProject}
        savedProjects={savedProjects}
        currentProjectId={projectId}
        onLoadProject={loadProject}
        onDeleteProject={handleDeleteProject}
        onSaveProject={() => saveProject({ silent: false })}
        hasUnsavedChanges={hasUnsavedChanges}
        isSavingProject={isSavingProject}
        lastSavedAt={lastSavedAt}
        hasActiveProject={projectFiles.length > 0 || messages.length > 0}
        onBuyCredits={() => setTopUpsOpen(true)}
      />
      {projectFiles.length>0 && <details className="px-4 py-1 text-xs"><summary className="cursor-pointer">Recovery</summary><Button variant="ghost" size="sm" disabled={isGenerating || isDeploying} onClick={async()=>{const {error}=await (supabase as any).rpc('mvp_edit_checkpoint',{p_project_id:projectId,p_restore:true});if(error)toast.error(error.message);else await loadProject(projectId,true);}}>Restore the checkpoint before the last paid change</Button></details>}
      {incomingIdea && <div role="status" className="flex flex-wrap items-center gap-3 border-b bg-primary/10 p-3 text-sm"><p className="min-w-0 flex-1 break-words">Your idea from /build: {incomingIdea}</p><Button size="sm" disabled={isGenerating} onClick={()=>void acceptIdea()}>Start this project</Button></div>}
      <MVPBuildPlanner setup={setupInput} onChange={setSetupInput} hasFiles={!!projectFiles.length} busy={quoting || isGenerating} workerAvailable={tests.available} connected={!!supabaseConnection.connected} onBuild={()=>void quotedSend(setupInput.buildBrief?.idea || setupInput.customPrompt || '')}/>
      <MVPManagedSetup projectId={projectId} brief={setupInput.buildBrief} save={()=>saveProject({silent:true})}/>
      {setupInput.buildBrief && !buildBriefErrors(setupInput.buildBrief).length && !setupInput.workflow && deriveCapabilities(setupInput.buildBrief).profile==='static_landing' && <section aria-label="Check and publish" className="flex flex-wrap items-center gap-3 border-b p-3 text-sm"><p className="flex-1">{tests.dirty?'Your app changed. Check this revision again.':tests.result?.status==='passed'?'Your landing page passed its navigation and mobile checks.':tests.result?.failure_details||'Check your call to action and mobile layout before publishing. No database is needed.'}</p><Button size="sm" disabled={!projectFiles.length||tests.testing||tests.available!==true||isShowingPreviewFallback||!setupInput.buildBrief.ctaUrl} onClick={()=>void tests.run()}>{tests.testing?'Checking your page...':'Check my page'}</Button>{tests.testRunId&&<Button size="sm" disabled={isDeploying} onClick={publishTested}>Publish checked page</Button>}</section>}
      <details className="shrink-0 max-h-[35vh] overflow-auto border-b px-3 text-xs"><summary className="cursor-pointer py-2">Database setup and launch verification</summary>
      <p className="p-2 text-muted-foreground">Automated outcome checks currently cover lead capture, request management and private saved records. Choose a check only when it matches your product. Other workflows still need matching checks before publication.</p>
      <MVPWorkflowPanel available={tests.available} projectId={projectId} setup={setupInput} onChange={next=>setSetupInput({...next,...(next.workflow && next.buildBrief ? {buildBrief:{...next.buildBrief,delivery:"connected" as const}} : {})})} hasFiles={!!projectFiles.length} connected={!!supabaseConnection.connected} onBuild={()=>void quotedSend('Build the agreed '+setupInput.workflow?.starter+' workflow for '+setupInput.workflow?.customer+'. Task: '+setupInput.workflow?.task+'. Success: '+setupInput.workflow?.outcome)} onTest={()=>void tests.run()} testing={tests.testing} result={tests.result} dirty={tests.dirty} fallback={isShowingPreviewFallback}/>
      </details>
      <Dialog open={!!consent} onOpenChange={open=>{if(!open)setConsent(null);}}><DialogContent><DialogHeader><DialogTitle>Confirm this build</DialogTitle></DialogHeader><p className="text-sm">{consent?.prompt}</p><p className="text-sm text-muted-foreground">{(setupInput.buildBrief?.features || setupInput.workflow?.features)?.join(' / ')}</p><p className="font-semibold">{consent?.cost} credits</p>{setupInput.buildBrief?.delivery==='preview' && <p className="rounded-md bg-amber-500/10 p-3 text-sm">This purchase creates a preview and exportable code. Cloud data, sign-in and checkout require connections. Publishing requires a supported passing outcome test{tests.available!==true?' and the currently offline testing service':''}.</p>}<p className="text-xs text-muted-foreground">Existing files are checkpointed before this change. Test-result review is free. Each repair requires a new quote.</p><Button onClick={()=>void confirmBuild()}>Confirm and build</Button></DialogContent></Dialog>
      <MVPBuilderTopUpDialog open={topUpsOpen} onOpenChange={setTopUpsOpen} />
      <MVPBuilderCreditExhaustedDialog
        open={isCreditExhaustedModalOpen}
        onOpenChange={(open) => {
          if (!open) closeCreditExhaustedModal();
        }}
      />

      {isGenerating && heldCredits > 0 && (
        <div className="border-b border-info/20 bg-info/10 px-4 py-2 text-center text-xs font-medium text-info">
          {creditsAvailable} credits available - {heldCredits} credits held while MVP Builder works
        </div>
      )}

      {!isGenerating && (
        <MVPBuilderLowCreditBanner
          projectName={projectName}
          onGetCredits={() => setTopUpsOpen(true)}
        />
      )}

<div className="flex-1 min-h-0 flex flex-col">
        <div className="flex md:hidden items-center justify-center border-b border-border/40 bg-card shrink-0 py-2">
          <div className="flex items-center rounded-full border border-white/10 bg-white/5 p-0.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <Button
              variant="ghost"
              size="pill-sm"
              className={cn(
                'gap-1.5 px-4 text-xs font-medium transition-all duration-200',
                mobileTab === 'chat'
                  ? 'bg-white text-foreground shadow-sm hover:bg-white hover:text-foreground'
                  : 'text-muted-foreground hover:bg-transparent hover:text-white'
              )}
              onClick={() => setMobileTab('chat')}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
            </Button>
            <Button
              variant="ghost"
              size="pill-sm"
              className={cn(
                'gap-1.5 px-4 text-xs font-medium transition-all duration-200',
                mobileTab === 'preview'
                  ? 'bg-white text-foreground shadow-sm hover:bg-white hover:text-foreground'
                  : 'text-muted-foreground hover:bg-transparent hover:text-white'
              )}
              onClick={() => setMobileTab('preview')}
            >
              <Monitor className="h-3.5 w-3.5" />
              Preview
            </Button>
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[32%_1px_minmax(0,1fr)]">
          {!isMobile && (
            <>
              <div className="min-h-0 border-r border-white/5 bg-background shadow-2xl">
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
