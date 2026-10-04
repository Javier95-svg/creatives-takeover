import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MVPBuilderSetupInput } from '@/lib/mvp-builder/phase1';
import type { WorkflowTestResult } from '@/hooks/useMvpWorkflowTest';
import { completedCheckLabels, shippingGuidance } from '@/lib/mvp-builder/shippingGuidance';
import { automaticWorkflow } from '../../../supabase/functions/_shared/mvp-builder-journey';
import { deriveCapabilities } from '../../../supabase/functions/_shared/mvp-capabilities';
import { MANAGED_WORKFLOW_SCHEMA } from '../../../supabase/functions/_shared/mvp-managed-workflow-schema';

type Props = {
  activity?: {completedRecords:number;observedAt:string;errorReports?:number;error?:string}|null;
  setup: MVPBuilderSetupInput; onChange: (next: Partial<MVPBuilderSetupInput>) => void;
  hasFiles: boolean; busy: boolean; progress: string; saveError: string | null;
  test: WorkflowTestResult | null; dirty: boolean; canPublish: boolean;
  workerAvailable: boolean | null; onBuild: () => void; onCheck: () => void;
  onPublish: () => void; onRetrySave: () => void; onRestore: () => void;
  onRefreshAvailability: () => void; checkFailure: string; deploymentUrl?: string | null;
  repairChanges: string[]; managedStage: string; managedFailure: string;
};
export function MVPBuilderShipControls(props: Props) {
  const {setup,onChange}=props,brief=setup.buildBrief;
  if(!brief)return props.saveError?<div role="alert" className="mb-3 text-xs text-destructive">{props.saveError}<Button variant="ghost" size="sm" disabled={props.busy} onClick={props.onRetrySave}>Retry save</Button></div>:null;
  const connected=brief.delivery==='connected';
  const guidance=shippingGuidance({...props,brief});
  const update=(patch:Partial<typeof brief>)=>{
    const next={...brief,...patch};
    onChange({buildBrief:next,workflow:automaticWorkflow(next),coreCustomer:next.customer,coreJob:next.task,essentialFeatures:next.features});
  };
  const failure=props.saveError||props.managedFailure||props.checkFailure||(!props.dirty&&props.test?.status==='failed'?props.test.failure_details||'The customer task needs repair.':'');
  const passed=!props.dirty&&props.test?.status==='passed' ? completedCheckLabels(props.test.assertions) : [];
  const actions={
    save:{label:'Retry save',run:props.onRetrySave},
    availability:{label:'Check availability',run:props.onRefreshAvailability},
    build:{label:'Review price and build',run:props.onBuild},
    check:{label:failure?'Retry app checks':'Check my app',run:props.onCheck},
    publish:{label:props.deploymentUrl?'Publish update':'Publish',run:props.onPublish},
  };
  const action=actions[guidance.action];
  return <div className="mb-4 rounded-xl border border-info/20 bg-white/[0.04] p-3 text-xs space-y-3" aria-busy={props.busy}>
    <div className="flex items-center justify-between gap-2"><strong className="text-foreground">{props.hasFiles?'Your app':'Your build plan'}</strong><span className="text-muted-foreground">{connected?'Connected app':'Preview / export'}</span></div>
    {!props.hasFiles&&<><p className="text-foreground">{brief.idea}</p><p><strong>For:</strong> {brief.customer}</p><p><strong>Main task:</strong> {brief.task}</p><p>{brief.features.join(', ')}</p></>}
    <p role="status" aria-live="polite">{props.progress || props.managedStage || (props.canPublish?'Ready to publish':props.dirty?'Changes need a fresh check':props.hasFiles?'Check the customer task before publishing':'Review the scope and price to begin.')}</p>
    {failure&&<div role="alert" className="space-y-1"><p className="text-destructive">{props.saveError?'Your latest changes have not been saved.':props.managedFailure?'App setup needs attention.':'Checks could not confirm this draft is ready.'}</p><p>{props.saveError?'Retry saving before building or publishing. Keep this tab open to retain your latest edits.':props.managedFailure?'Review the details below, then retry the build to resume setup.':props.dirty?'Your draft changed. Run fresh checks on your latest changes.':'Review the details below and retry. If the same task fails again, describe the expected behavior in chat.'}</p><details><summary className="cursor-pointer">Failure details</summary><p className="pt-2 break-words">{failure}</p></details></div>}
    {!!guidance.issues.length&&<div role="alert"><p>Update your app details before continuing:</p><ul className="list-disc pl-4">{guidance.issues.map(issue=><li key={issue}>{issue}</li>)}</ul></div>}
    {props.workerAvailable===null&&connected&&<p>Checking launch service availability?</p>}
    {props.workerAvailable===false&&<p>Launch checks are offline. Check availability to try again. You can continue editing and exporting; preview mode is available in App details before managed setup.</p>}
    {props.hasFiles&&guidance.launchBlocker&&!guidance.issues.length&&<p>{guidance.launchBlocker}</p>}
    {!!passed.length&&<details><summary className="cursor-pointer">What passed ({passed.length} checks)</summary><ul className="list-disc pl-4 pt-2">{passed.map(label=><li key={label}>{label}</li>)}</ul><p className="pt-2">These results apply to this saved draft. Editing requires fresh checks.</p></details>}
    {props.activity&&<p role="status">{props.activity.error||`Database reachable; ${props.activity.completedRecords} saved records; checked ${new Date(props.activity.observedAt).toLocaleTimeString()}`}</p>}
    {!!props.activity?.errorReports&&<p role="alert">{props.activity.errorReports} browser error reports in the last 24 hours. Run a fresh check; reports do not verify a completed task.</p>}
    {props.repairChanges.length>0&&<details><summary className="cursor-pointer">Changes from your included repair</summary><ul className="pt-2 break-words">{props.repairChanges.map(path=><li key={path}>{path}</li>)}</ul></details>}
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" disabled={props.busy||guidance.disabled} onClick={action.run}>{action.label}</Button>
      {props.deploymentUrl?.startsWith('https://')&&<a className="underline underline-offset-4" href={props.deploymentUrl} target="_blank" rel="noopener noreferrer">Open live app</a>}
    </div>
    {props.deploymentUrl&&<p>Your public release stays available while you edit. Publish an update after the new draft passes its checks.</p>}
    <details open={guidance.issues.length>0||undefined}><summary className="cursor-pointer text-muted-foreground">App details and recovery</summary><div className="space-y-3 pt-3">
      <Label htmlFor="mvp-customer">Who uses it?</Label><Input id="mvp-customer" disabled={props.busy} placeholder="For example, customers requesting design work" value={brief.customer} onChange={e=>update({customer:e.target.value})}/>
      <Label htmlFor="mvp-task">Their main task</Label><Input id="mvp-task" disabled={props.busy} value={brief.task} onChange={e=>update({task:e.target.value})}/>
      <Label htmlFor="mvp-features">Essential features (up to three, separated by commas)</Label><Input id="mvp-features" disabled={props.busy} value={brief.features.join(', ')} onChange={e=>update({features:e.target.value.split(',').map(f=>f.trim()).filter(Boolean)})}/>
      <Label htmlFor="mvp-delivery">Build mode</Label><select id="mvp-delivery" disabled={props.busy||!!setup.managedRuntime} className="w-full rounded-md border bg-background p-2" value={setup.backendMode||'managed'} onChange={e=>{const mode=e.target.value as 'managed'|'external'|'preview';const next={...brief,delivery:mode==='preview'?'preview' as const:'connected' as const};onChange({backendMode:mode,managedApp:mode==='managed'&&!!setup.managedRuntime,buildBrief:next,workflow:automaticWorkflow(next)});}}><option value="managed">Managed database and sign-in</option><option value="external">Use my connected Supabase</option><option value="preview">Preview and export only</option></select>
      {setup.backendMode!=='external'&&connected&&<p>We set up the app database and sign-in. GitHub is optional. Lead capture, request tracking and private customer records are supported; payments and native apps are deferred.</p>}
      {deriveCapabilities(brief).profile==='static_landing'&&<><Label htmlFor="mvp-cta">Main button destination</Label><Input id="mvp-cta" disabled={props.busy} placeholder="https://your-destination.com" value={brief.ctaUrl||''} onChange={e=>update({ctaUrl:e.target.value})}/></>}
      {setup.backendMode==='external'&&<><p>Use a separate app database. Setup requires access to its Supabase dashboard.</p><ol className="list-decimal pl-4 space-y-1"><li>Connect your app project through Integrations.</li><li>Download the database setup below and run it in that project's SQL editor.</li><li>Register your founder account as the workflow owner and configure sign-in redirects and email delivery.</li><li>Paste the publishable key below, then build and check the app.</li></ol><Label htmlFor="mvp-public-key">Connected database publishable key</Label><Input id="mvp-public-key" disabled={props.busy} value={setup.workflowPublicKey||''} onChange={e=>onChange({workflowPublicKey:e.target.value})}/><Button size="sm" variant="outline" onClick={()=>{const url=URL.createObjectURL(new Blob([MANAGED_WORKFLOW_SCHEMA],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='app-workflow-schema.sql';a.click();URL.revokeObjectURL(url);}}>Download database setup</Button></>}
      {!connected&&<p>Preview mode lets you try the interface and export code. Simulated accounts and device-only data are labeled Preview. A connected data app needs working services and passing checks before launch.</p>}
      {props.deploymentUrl&&setup.managedRuntime&&connected&&<p>To access your founder account, open the live app and use its password recovery control with your CT account email. Check your inbox to set your password.</p>}
      {props.hasFiles&&<><p>Restore changes the draft. Customer data and the public release stay available. Your current draft must save successfully first.</p><Button size="sm" variant="ghost" disabled={props.busy} onClick={props.onRestore}>Restore before the last change</Button></>}
    </div></details>
  </div>;
}
