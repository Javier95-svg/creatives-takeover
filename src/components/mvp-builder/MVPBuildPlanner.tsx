import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Label} from '@/components/ui/label';
import {buildBriefErrors,type MVPBuildBrief} from '../../../supabase/functions/_shared/mvp-build-brief';
import {automaticWorkflow,planFromPrompt} from '../../../supabase/functions/_shared/mvp-builder-journey';
import {unsupportedRequest} from '../../../supabase/functions/_shared/mvp-capabilities';
import type {MVPBuilderSetupInput} from '@/lib/mvp-builder/phase1';

export function MVPBuildPlanner({setup,onChange,onBuild,hasFiles,busy,workerAvailable,connected}:{
 setup:MVPBuilderSetupInput;onChange:(v:Partial<MVPBuilderSetupInput>)=>void;onBuild:()=>void;
 hasFiles:boolean;busy:boolean;workerAvailable:boolean|null;connected:boolean;
}){
 const [expanded,setExpanded]=useState(!hasFiles);
 const b=setup.buildBrief;
 const update=(patch:Partial<MVPBuildBrief>)=>{
  const next={...(b||planFromPrompt('')), ...patch};
  onChange({buildBrief:next,customPrompt:next.idea,workflow:automaticWorkflow(next)});
 };
 const describe=(idea:string)=>{
  if(hasFiles&&b){update({idea});return;}
  const next=planFromPrompt(idea,b?.customer||setup.coreCustomer||'');
  if(b){next.delivery=b.delivery;next.ctaUrl=b.ctaUrl;next.checkoutUrl=b.checkoutUrl;}
  onChange({buildBrief:next,customPrompt:idea,workflow:automaticWorkflow(next)});
 };
 const errors=buildBriefErrors(b),excluded=b?unsupportedRequest(b.idea):null;
 return <section aria-label="Plan your product" className="shrink-0 max-h-[48vh] overflow-auto border-b bg-card p-4">
  <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">{hasFiles?'Your app':'What would you like to build?'}</h2><p className="text-xs text-muted-foreground">{hasFiles?'Ask for changes in chat. Your saved versions remain available.':'Describe the app and what someone should be able to do. Review the price before building.'}</p></div>{hasFiles&&<Button variant="ghost" size="sm" onClick={()=>setExpanded(!expanded)}>{expanded?'Close app details':'App details'}</Button>}</div>
  {expanded&&<div className="mt-3 space-y-3">
   <Label>Describe your app<Textarea className="mt-1 min-h-24" value={b?.idea||''} disabled={busy} onChange={e=>describe(e.target.value)} maxLength={4000} placeholder="Build a customer portal where my clients can sign in, save project notes, and return to edit them."/></Label>
   {!b?.idea&&<div className="flex flex-wrap gap-2">{['A portfolio with a booking link','A waitlist for my new product','Private project notes for my clients'].map(idea=><Button key={idea} variant="outline" size="sm" disabled={busy} onClick={()=>describe(idea)}>{idea}</Button>)}</div>}
   {b&&<details className="rounded-lg border p-3"><summary className="cursor-pointer text-sm font-medium">App details and connections</summary><div className="mt-3 grid gap-3 sm:grid-cols-2">
    <Label>Who is it for?<Input value={b.customer} onChange={e=>update({customer:e.target.value})} maxLength={500}/></Label>
    <Label>Main user task<Input value={b.task} onChange={e=>update({task:e.target.value})} maxLength={500}/></Label>
    <Label className="sm:col-span-2">Initial features<Textarea value={b.features.join('\n')} onChange={e=>update({features:e.target.value.split('\n').slice(0,3)})}/></Label>
    {b.kind==='landing'&&<Label>Main button destination<Input type="url" value={b.ctaUrl||''} onChange={e=>update({ctaUrl:e.target.value})} placeholder="https://..."/></Label>}
    {(b.kind==='store'||b.kind==='saas')&&<Label>Hosted checkout link<Input type="url" value={b.checkoutUrl||''} onChange={e=>update({checkoutUrl:e.target.value})} placeholder="https://..."/><span className="text-xs text-muted-foreground">A link alone does not provide order handling or subscription access.</span></Label>}
    <label className="sm:col-span-2 flex items-start gap-2 text-sm"><input type="checkbox" checked={b.delivery==='connected'} onChange={e=>update({delivery:e.target.checked?'connected':'preview'})}/><span>Use my connected app database<span className="block text-xs text-muted-foreground">Optional for the first draft. Existing database connections remain available under Advanced.</span></span></label>
   </div></details>}
   {b?.delivery==='connected'&&!connected&&<p role="status" className="text-xs text-amber-600">Connect your app database under Advanced before building with saved data.</p>}
   {workerAvailable!==true&&<p role="status" className="rounded-md bg-amber-500/10 p-2 text-xs">{workerAvailable===null?'Checking publishing availability...':'Publishing checks are currently offline. A paid build produces a preview and exportable code; it will not make publishing available.'}</p>}
   {excluded&&<p role="alert" className="text-sm text-destructive">{excluded}</p>}
   {!excluded&&b?.idea&&errors.length>0&&<p className="text-xs text-muted-foreground">{errors[0]}</p>}
   <Button disabled={busy||errors.length>0||!!excluded||(b?.delivery==='connected'&&(!connected||workerAvailable!==true))} onClick={onBuild}>{busy?'Preparing...':hasFiles?'Review changes and price':'Review price and build'}</Button>
  </div>}
 </section>;
}
