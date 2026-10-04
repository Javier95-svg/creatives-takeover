import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useMvpWorkflowTest } from '@/hooks/useMvpWorkflowTest';
import { MVPBuilderShipControls } from './MVPBuilderShipControls';
import { planFromPrompt, automaticWorkflow, launchRequirement } from '../../../supabase/functions/_shared/mvp-builder-journey';
import { buildBriefErrors } from '../../../supabase/functions/_shared/mvp-build-brief';
import { deriveCapabilities, RELEASED_MANAGED_PROFILES } from '../../../supabase/functions/_shared/mvp-capabilities';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
    saveError,
  } = useMVPBuilder();

  const draftIdentity = JSON.stringify([projectId, projectFiles, setupInput.buildBrief, setupInput.workflow, setupInput.workflowPublicKey, setupInput.managedRuntime, supabaseConnection.connectionId]);
  const tests = useMvpWorkflowTest(projectId, draftIdentity, () => saveProject({silent:true}), isShowingPreviewFallback, hasUnsavedChanges, () => loadProject(projectId, true));
  const [consent, setConsent] = useState<{prompt:string;cost:number;identity:string}|null>(null);
  const [preparing, setPreparing] = useState(false);
  const [activity, setActivity] = useState<{completedRecords:number;observedAt:string;errorReports?:number;error?:string}|null>(null);
  useEffect(()=>{
    setActivity(null);if(!deploymentUrl||!setupInput.managedRuntime)return;let active=true;
    const check=async()=>{try{const {data,error}=await supabase.functions.invoke('mvp-managed-app',{body:{action:'activity',projectId}});if(active)setActivity(error||data?.error?{completedRecords:0,observedAt:'',error:'App health could not be checked. Retry shortly.'}:data);}catch{if(active)setActivity({completedRecords:0,observedAt:'',error:'App health could not be checked. Retry shortly.'});}};
    void check();const timer=setInterval(()=>void check(),60_000);return()=>{active=false;clearInterval(timer);};
  },[deploymentUrl,projectId,setupInput.managedRuntime?.projectId]);
  const [managedStage, setManagedStage] = useState('');
  const [managedFailure, setManagedFailure] = useState('');
  const autoCheck = useRef<string|null>(null);
  const operation = useRef(0);
  const latest = useRef({setupInput, sendMessage, saveProject, projectId});
  latest.current = {setupInput, sendMessage, saveProject, projectId};
  useEffect(() => { operation.current++; autoCheck.current=null; setPreparing(false); setManagedStage(''); setManagedFailure(''); setConsent(null); }, [projectId]);
  useEffect(() => () => { operation.current++; }, []);
  const busy = isGenerating || isDeploying || preparing || tests.testing;
  const errorMessage = async (data: any, error: any) => {
    if(data?.error)return data.error;
    if(error?.context instanceof Response){try{return (await error.context.json()).error||error.message;}catch{}}
    return error?.message||'This service is unavailable. Your draft is safe.';
  };
  const quotedSend = async (prompt:string, options?:{responseMode?:'chat'|'build'}) => {
    if(busy)return;
    if(options?.responseMode==='chat')return sendMessage(prompt,options);
    if(!setupInput.buildBrief){
      const brief=planFromPrompt(projectFiles.length?(setupInput.customPrompt||setupInput.oneLineDescription||prompt):prompt, setupInput.coreCustomer||setupInput.validatedTargetSegment);
      const profile=deriveCapabilities(brief).profile;
      const released=RELEASED_MANAGED_PROFILES.some(p=>p===profile);
      brief.delivery=!projectFiles.length&&released?'connected':'preview';
      if(setupInput.essentialFeatures?.length)brief.features=setupInput.essentialFeatures.slice(0,3);
      setSetupInput({buildBrief:brief,workflow:automaticWorkflow(brief),backendMode:brief.delivery==='connected'?'managed':'preview',coreCustomer:brief.customer,coreJob:brief.task,essentialFeatures:brief.features,successEvent:automaticWorkflow(brief)?.outcome||'Visitor completes the main action',customPrompt:prompt});
      toast.info('Your build plan is ready. Review its scope and price in the chat.');
      return;
    }
    const errors=buildBriefErrors(setupInput.buildBrief);
    if(errors.length){toast.error(errors[0]);return;}
    if(setupInput.buildBrief.delivery==='connected'&&tests.available!==true){toast.error('Launch checks are offline. No credits were charged. You can choose preview/export in App details.');return;}
    const workflow=automaticWorkflow(setupInput.buildBrief);
    if(workflow&&setupInput.buildBrief.delivery==='connected'&&!tests.profiles.includes(workflow.starter)){toast.error('Checks for this workflow need the updated worker. Your plan is saved; no credits were charged.');return;}
    const quote=await classifyActionQuote(prompt);
    if(!quote||quote.actionType==='unsupported'||quote.actionType==='unclear'){toast.error('This release supports leads, request tracking and private records. Payments and complex backends are deferred.');return;}
    setConsent({prompt,cost:quote.creditCost,identity:JSON.stringify([draftIdentity,selectedModels])});
  };
  const confirmBuild = async () => {
    const next=consent;if(!next||busy)return;setConsent(null);
    if(next.identity!==JSON.stringify([draftIdentity,selectedModels])){toast.error('The scope changed. Review a fresh price.');return;}
    const run=++operation.current;setPreparing(true);setManagedFailure('');
    try {
      if(!await saveProject({silent:true}))throw Error('Save failed. Nothing was built.');
      const brief=setupInput.buildBrief!;
      if(brief.delivery==='connected'&&(setupInput.backendMode||'managed')==='managed'){
        const call=async(action:string)=>{const {data,error}=await supabase.functions.invoke('mvp-managed-app',{body:{action,projectId}});if(error||data?.error)throw Error(await errorMessage(data,error));return data;};
        if(!setupInput.managedRuntime){
          let app=await call('setup');
          const deadline=Date.now()+10*60_000;
          while(app.status!=='ready'&&Date.now()<deadline){
            if(operation.current!==run)return;
            if(app.status==='review'||app.status==='failed')throw Error(app.failure||'App setup needs an operator check. Your draft is preserved.');
            setManagedStage(app.stage||'Preparing your app database and sign-in...');
            await new Promise(resolve=>setTimeout(resolve,5000));
            app=await call('advance');
            if(app.failure)setManagedStage(app.failure);
          }
          if(!app.runtime)throw Error('Setup is still in progress. Retry to resume the same app.');
          if(operation.current!==run)return;
          setSetupInput({managedApp:true,managedRuntime:app.runtime,workflowPublicKey:app.runtime.publicKey,workflow:automaticWorkflow(brief)});
          // Wait for the new connection to reach the hook used by generation and saving.
          const until=Date.now()+5000;
          while(!latest.current.setupInput.managedRuntime&&Date.now()<until)await new Promise(resolve=>setTimeout(resolve,25));
          if(!latest.current.setupInput.managedRuntime)throw Error('App setup is ready. Reopen the saved project to continue.');
          if(!await latest.current.saveProject({silent:true}))throw Error('Save the app connection before building.');
        }
      }else if(brief.delivery==='connected'&&!supabaseConnection.connected)throw Error('Connect your Supabase project under Integrations first.');
      if(operation.current!==run)return;
      if(projectFiles.length){
        const {error}=await (supabase as any).rpc('mvp_edit_checkpoint',{p_project_id:projectId,p_restore:false});
        if(error)throw Error('The recovery checkpoint could not be saved. Your source is unchanged.');
        createManualSnapshot();
      }
      autoCheck.current=JSON.stringify(projectFiles);
      setManagedStage('Building your app...');
      await latest.current.sendMessage(next.prompt,{responseMode:'build'});
    }catch(error){if(operation.current===run){const message=error instanceof Error?error.message:'Build preparation failed.';setManagedFailure(message);toast.error(message);}}
    finally{if(operation.current===run){setPreparing(false);setManagedStage('');}}
  };
  useEffect(()=>{
    if(busy||autoCheck.current===null||JSON.stringify(projectFiles)===autoCheck.current)return;
    autoCheck.current=null;
    if(setupInput.buildBrief&&(setupInput.buildBrief.delivery==='connected'||deriveCapabilities(setupInput.buildBrief).profile==='static_landing'&&setupInput.buildBrief.ctaUrl))void tests.run();
  },[busy,projectFiles,setupInput.buildBrief]);
  const publishTested=()=>{
    const requirement=launchRequirement(setupInput.buildBrief,!!setupInput.workflow);
    if(requirement){toast.error(requirement);return;}
    if(!tests.testRunId){void tests.run();return;}
    void publishProject(tests.testRunId);
  };
  const safeLoad=async(id:string)=>{if(busy)return;if(hasUnsavedChanges&&!await saveProject({silent:true}))return;await loadProject(id,true);};
  const safeNew=async()=>{if(busy)return;if(hasUnsavedChanges&&!await saveProject({silent:true}))return;resetProject();};
  const controls=<MVPBuilderShipControls setup={setupInput} onChange={setSetupInput} hasFiles={!!projectFiles.length} busy={busy} progress={isDeploying?'Publishing and verifying your address...':isGenerating?'Building...':preparing?managedStage:tests.testing?tests.progress:hasUnsavedChanges||tests.dirty?'Changes need a fresh check':tests.testRunId?(deploymentUrl?'Live release available; draft ready to publish':'Ready to publish'):tests.result?.status==='failed'?tests.progress:deploymentUrl?'Live release available; check this draft before publishing an update':''}
    activity={activity} saveError={saveError} test={tests.result} dirty={tests.dirty} canPublish={!!tests.testRunId} workerAvailable={tests.available}
    onBuild={()=>void quotedSend(setupInput.customPrompt||setupInput.buildBrief?.idea||'')} onCheck={()=>void tests.run()} onPublish={publishTested}
    onRetrySave={()=>void saveProject({silent:false})} repairChanges={tests.repairChanges} managedStage={managedStage} managedFailure={managedFailure}
    onRestore={()=>void (async()=>{if(!await saveProject({silent:true}))return;const {error}=await (supabase as any).rpc('mvp_edit_checkpoint',{p_project_id:projectId,p_restore:true});if(error)toast.error(error.message);else await loadProject(projectId,true);})()}/>;

  const [mobileTab, setMobileTab] = useState<MobileTab>('chat');
  const [topUpsOpen, setTopUpsOpen] = useState(false);
  const isMobile = useIsMobile();
  // Manual preview fixes review a price before submission.
  // Included outcome repairs are bounded server-side and do not charge credits.
  const autoFixAttemptsRef = useRef<Map<string, number>>(new Map());
  const handleAutoFix = (error: string) => {
    const signature = error.trim().slice(0, 160);
    const attempts = autoFixAttemptsRef.current.get(signature) ?? 0;
    if (attempts >= 2) {
      toast.info('Auto-fix already tried twice for this error.', {
        description: 'Describe what you expected in the chat so the builder gets more context.',
      });
      return;
    }
    autoFixAttemptsRef.current.set(signature, attempts + 1);
    void quotedSend(
      `Fix this runtime error without changing the app's design or unrelated behavior. Error (attempt ${attempts + 1} of 2):\n\n${error.trim().slice(0, 1200)}`,
      { responseMode: 'build' },
    );
  };

  const handleDeleteProject = async (id: string) => {
    if(busy)return false;
    if(id===projectId&&hasUnsavedChanges&&!await saveProject({silent:true}))return false;
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
      workflowControls={controls}
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
      isGenerating={busy}
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
      onSaveCodeFile={(path,content)=>{if(!busy)updateProjectFile(path,content);}}
      onResetCodeFile={path=>{if(!busy)resetProjectFile(path);}}
      onResetProjectCode={()=>{if(!busy)resetProjectCode();}}
      onCreateSnapshot={createManualSnapshot}
      onRestoreSnapshot={id=>{if(!busy)restoreProjectSnapshot(id);}}
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
        onNewProject={()=>void safeNew()}
        savedProjects={savedProjects}
        currentProjectId={projectId}
        onLoadProject={safeLoad}
        onDeleteProject={handleDeleteProject}
        onSaveProject={() => saveProject({ silent: false })}
        hasUnsavedChanges={hasUnsavedChanges}
        isSavingProject={isSavingProject}
        lastSavedAt={lastSavedAt}
        hasActiveProject={projectFiles.length > 0 || messages.length > 0}
        onBuyCredits={() => setTopUpsOpen(true)}
      />
      <Dialog open={!!consent} onOpenChange={open=>{if(!open)setConsent(null);}}><DialogContent><DialogHeader><DialogTitle>Review this build</DialogTitle></DialogHeader><p className="text-sm">{consent?.prompt}</p><p className="text-sm text-muted-foreground">{setupInput.buildBrief?.features.join(', ')}</p><p className="font-semibold">{consent?.cost} credits</p><p className="text-xs text-muted-foreground">{setupInput.buildBrief?.delivery==='connected'?'Managed app setup is subject to the invited pilot capacity and budget. This build includes two automatic outcome repair attempts.':'This creates a preview and exportable code. Simulated services are labeled; connected outcome checks are required to launch a data app.'} New scope is quoted separately.</p><Button onClick={()=>void confirmBuild()}>Confirm and build</Button></DialogContent></Dialog>
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
