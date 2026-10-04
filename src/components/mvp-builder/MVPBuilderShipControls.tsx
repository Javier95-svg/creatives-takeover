import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MVPBuilderSetupInput } from '@/lib/mvp-builder/phase1';
import type { WorkflowTestResult } from '@/hooks/useMvpWorkflowTest';
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
 repairChanges: string[]; managedStage: string; managedFailure: string;
};
export function MVPBuilderShipControls(props: Props) {
 const {setup,onChange}=props,brief=setup.buildBrief;
 if(!brief)return props.saveError?<div role="alert" className="mb-3 text-xs text-destructive">{props.saveError}<Button variant="ghost" size="sm" onClick={props.onRetrySave}>Retry save</Button></div>:null;
 const connected=brief.delivery==='connected';
 const update=(patch:Partial<typeof brief>)=>{const next={...brief,...patch};onChange({buildBrief:next,workflow:automaticWorkflow(next)});};
 return <div className="mb-4 rounded-xl border border-info/20 bg-white/[0.04] p-3 text-xs space-y-3">
  <div className="flex items-center justify-between gap-2"><strong className="text-foreground">{props.hasFiles?'Your app':'Your build plan'}</strong><span className="text-muted-foreground">{connected?'Connected app':'Preview / export'}</span></div>
  {!props.hasFiles&&<><p className="text-foreground">{brief.idea}</p><p>{brief.features.join(', ')}</p></>}
  <p role="status">{props.progress || props.managedStage || (props.canPublish?'Ready to publish':props.dirty?'Changes need a fresh check':props.hasFiles?'Check the customer task before publishing':'Review the scope and price to begin.')}</p>
  {(props.saveError||props.managedFailure||props.test?.status==='failed')&&<p role="alert" className="text-destructive">{props.saveError||props.managedFailure||props.test?.failure_details||'The customer task needs repair.'}</p>}
  {props.workerAvailable===false&&<p>Launch checks are offline. Your draft is safe; preview and export remain available.</p>}
  {props.activity&&<p role="status">{props.activity.error||`Database reachable; ${props.activity.completedRecords} saved records; checked ${new Date(props.activity.observedAt).toLocaleTimeString()}`}</p>}
  {!!props.activity?.errorReports&&<p role="alert">{props.activity.errorReports} browser error reports in the last 24 hours. Run a fresh check; reports do not verify a completed task.</p>}
  {props.repairChanges.length>0&&<p>Included repair changed {props.repairChanges.join(', ')}.</p>}
  <div className="flex flex-wrap gap-2">
   {!props.hasFiles&&<Button size="sm" disabled={props.busy} onClick={props.onBuild}>Review price and build</Button>}
   {props.hasFiles&&<Button size="sm" variant="outline" disabled={props.busy||props.workerAvailable!==true} onClick={props.onCheck}>Check my app</Button>}
   {props.canPublish&&<Button size="sm" disabled={props.busy} onClick={props.onPublish}>Publish</Button>}
   {props.saveError&&<Button size="sm" variant="outline" disabled={props.busy} onClick={props.onRetrySave}>Retry save</Button>}
  </div>
  <details><summary className="cursor-pointer text-muted-foreground">App details and recovery</summary><div className="space-y-3 pt-3">
   <Label htmlFor="mvp-customer">Who uses it?</Label><Input id="mvp-customer" disabled={props.busy} value={brief.customer} onChange={e=>update({customer:e.target.value})}/>
   <Label htmlFor="mvp-task">Their main task</Label><Input id="mvp-task" disabled={props.busy} value={brief.task} onChange={e=>update({task:e.target.value})}/>
   <Label htmlFor="mvp-features">Essential features (up to three, separated by commas)</Label><Input id="mvp-features" disabled={props.busy} value={brief.features.join(', ')} onChange={e=>update({features:e.target.value.split(',').map(f=>f.trim()).filter(Boolean)})}/>
   <Label htmlFor="mvp-delivery">Build mode</Label><select id="mvp-delivery" disabled={props.busy||!!setup.managedRuntime} className="w-full rounded-md border bg-background p-2" value={setup.backendMode||'managed'} onChange={e=>{const mode=e.target.value as 'managed'|'external'|'preview';const next={...brief,delivery:mode==='preview'?'preview' as const:'connected' as const};onChange({backendMode:mode,managedApp:mode==='managed'&&!!setup.managedRuntime,buildBrief:next,workflow:automaticWorkflow(next)});}}><option value="managed">Managed database and sign-in</option><option value="external">Use my connected Supabase</option><option value="preview">Preview and export only</option></select>
   {deriveCapabilities(brief).profile==='static_landing'&&<><Label htmlFor="mvp-cta">Main button destination</Label><Input id="mvp-cta" disabled={props.busy} value={brief.ctaUrl||''} onChange={e=>update({ctaUrl:e.target.value})}/></>}
   {setup.backendMode==='external'&&<><Label htmlFor="mvp-public-key">Connected database publishable key</Label><Input id="mvp-public-key" disabled={props.busy} value={setup.workflowPublicKey||''} onChange={e=>onChange({workflowPublicKey:e.target.value})}/><p>Install the workflow schema in your app database, set the workflow starter, and register its owner account.</p><Button size="sm" variant="outline" onClick={()=>{const url=URL.createObjectURL(new Blob([MANAGED_WORKFLOW_SCHEMA],{type:'text/plain'}));const a=document.createElement('a');a.href=url;a.download='app-workflow-schema.sql';a.click();URL.revokeObjectURL(url);}}>Download database setup</Button></>}
   {!connected&&<p>Simulated sign-in and local data must be labeled Preview. Connected services and passing outcome checks are required to launch a data app.</p>}
   {props.hasFiles&&<><p>Restore changes the draft. Customer data and the public release stay available.</p><Button size="sm" variant="ghost" disabled={props.busy} onClick={props.onRestore}>Restore before the last change</Button></>}
  </div></details>
 </div>;
}
