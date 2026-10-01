import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { MVPBuilderSetupInput } from '@/lib/mvp-builder/phase1';
import { WORKFLOW_STARTERS, type WorkflowStarter, workflowErrors } from '../../../supabase/functions/_shared/mvp-workflow';
import schemaSql from '../../../workers/mvp-workflow/schema.sql?raw';
import { toast } from 'sonner';

export function MVPWorkflowPanel({setup, onChange, hasFiles, connected, onBuild, onTest, testing, result, dirty, fallback, projectId, available = true}: {
  available?:boolean|null;
  projectId:string;
  setup:MVPBuilderSetupInput; onChange:(v:MVPBuilderSetupInput)=>void; hasFiles:boolean; connected:boolean;
  onBuild:()=>void; onTest:()=>void; testing:boolean; result:{status:string;revision:string;assertions:Record<string,boolean>;failure_details?:string}|null; dirty:boolean; fallback:boolean;
}) {
  const [open,setOpen]=useState(!hasFiles);
  const [ownerEmail,setOwnerEmail]=useState('');
  const copySetup=async()=>{
    if(!/^[0-9a-f-]{36}$/i.test(projectId) || !ownerEmail.includes('@')){toast.error('Enter the email of your app owner account.');return;}
    const email=ownerEmail.trim().replace(/'/g,"''");
    const register="\nDO $owner$ DECLARE owner_id uuid; BEGIN SELECT id INTO owner_id FROM auth.users WHERE email='"+email+"'; IF owner_id IS NULL THEN RAISE EXCEPTION 'Create the owner account in Supabase Authentication first'; END IF; INSERT INTO public.ct_mvp_workflow_owners(project_key,user_id) VALUES ('"+projectId+"',owner_id) ON CONFLICT(project_key) DO UPDATE SET user_id=excluded.user_id; END $owner$;";
    try{await navigator.clipboard.writeText(schemaSql+register);toast.success('Database setup SQL copied. Run it in the connected app database.');}catch{toast.error('Clipboard unavailable. Use the schema file in workers/mvp-workflow.');}
  };
  const w=setup.workflow;
  const change=(patch:Partial<NonNullable<typeof w>>)=>w && onChange({...setup,workflow:{...w,...patch}});
  const errors=workflowErrors(w);
  const stage=!hasFiles?'Describe':fallback?'Build':!result || result.status!=='passed' || dirty?'Test':'Publish';
  return <section className="shrink-0 max-h-[45vh] overflow-auto border-b bg-card p-3 text-sm" aria-label="Customer workflow">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <ol className="flex gap-3 text-xs">{['Describe','Build','Test','Publish'].map((item,i)=><li key={item} aria-current={stage===item?'step':undefined} className={stage===item?'font-semibold text-primary':'text-muted-foreground'}>{i+1}. {item}</li>)}</ol>
      <Button variant="ghost" size="sm" onClick={()=>setOpen(!open)}>{open?'Hide scope':'Review scope'}</Button>
    </div>
    {available!==true && <p role="status" className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs">{available===null ? "Checking workflow testing availability..." : "Workflow testing and new publishing are temporarily unavailable. New builds are paused; existing apps remain editable and exportable. Existing published links stay available."}</p>}
    {open && <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <label>Starter<select className="mt-1 w-full rounded-md border bg-background p-2" value={w?.starter || ''} onChange={e=>{const starter=e.target.value as WorkflowStarter; const d=WORKFLOW_STARTERS[starter];onChange({...setup,workflow:{version:1,starter,customer:setup.coreCustomer || '',task:d.task,outcome:d.outcome,features:[...d.features]},coreJob:d.task,successEvent:d.outcome,essentialFeatures:[...d.features],template:starter==='lead_capture'?'waitlist_landing':'blank'});}}><option value="" disabled>Choose one useful workflow</option>{Object.entries(WORKFLOW_STARTERS).map(([id,d])=><option key={id} value={id}>{d.label}</option>)}</select></label>
      <Label>Who uses it?<Input className="mt-1" value={w?.customer || ''} disabled={!w} onChange={e=>change({customer:e.target.value})} placeholder="For example, local homeowners"/></Label>
      <Label>What will they do?<Input className="mt-1" value={w?.task || ''} disabled={!w} onChange={e=>change({task:e.target.value})}/></Label>
      <Label>What proves it worked?<Textarea className="mt-1" value={w?.outcome || ''} disabled={!w} onChange={e=>change({outcome:e.target.value})}/></Label>
      <Label>Essential features (up to three, one per line)<Textarea className="mt-1" value={w?.features.join('\n') || ''} disabled={!w} onChange={e=>change({features:e.target.value.split('\n').slice(0,3)})}/></Label>
      <div className="space-y-2"><p className="text-xs text-muted-foreground">{connected?'Database connected. Install the workflow schema in that project before testing.':'This workflow saves customer data. Open Database to connect your Supabase project.'}</p><Label>Database publishable / anon key<Input value={setup.workflowPublicKey || ''} onChange={e=>onChange({...setup,workflowPublicKey:e.target.value})} placeholder="Public browser key, never service_role"/></Label><p className="text-xs text-muted-foreground">Use the same public key as your connected project. Testing and viewing results are free.</p></div>
    </div>}
    {open && <details className="mt-3 text-xs"><summary className="cursor-pointer">Database setup</summary><p className="my-2">In your connected app database, create the owner account in Supabase Authentication with a password. Enter that email below, then copy and run the setup SQL in that database’s SQL Editor. Use this account to view leads and manage requests.</p><div className="flex flex-wrap items-center gap-2"><Input className="max-w-xs" aria-label="App owner email" value={ownerEmail} onChange={e=>setOwnerEmail(e.target.value)} placeholder="owner@example.com"/><Button size="sm" variant="outline" onClick={()=>void copySetup()}>Copy database setup SQL</Button></div></details>}
    <div className="mt-3 flex flex-wrap items-center gap-3">
      {!hasFiles && <Button size="sm" disabled={available!==true || !!errors.length || !connected} onClick={onBuild}>Review scope and build price</Button>}
      {hasFiles && <Button size="sm" variant="outline" disabled={available!==true || testing || fallback || !!errors.length || !connected} onClick={onTest}>{testing?'Testing customer workflow…':'Save and test workflow'}</Button>}
      <p role="status" className="text-xs text-muted-foreground">{fallback?'Showing a fallback. Repair the current build before testing or publishing.':dirty && result?'Edited since testing. Save and test again.':result?('Test: '+result.status+' · revision '+result.revision.slice(0,10)):hasFiles?'No server outcome test for this revision.':'Build and publish a small product that completes one useful customer task.'}</p>
    </div>
    {result?.failure_details && <p role="alert" className="mt-2 text-xs text-destructive">{result.failure_details}</p>}
    {result && <ul className="mt-2 flex flex-wrap gap-3 text-xs">{Object.entries(result.assertions).map(([name,passed])=><li key={name}>{passed?'✓':'✕'} {name.replace(/_/g,' ')}</li>)}</ul>}
  </section>;
}
