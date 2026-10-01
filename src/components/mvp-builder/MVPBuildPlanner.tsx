import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BUILD_TYPES, createBuildBrief, buildBriefErrors, type BuildType } from '../../../supabase/functions/_shared/mvp-build-brief';
import type { MVPBuilderSetupInput } from '@/lib/mvp-builder/phase1';

export function MVPBuildPlanner({setup,onChange,onBuild,hasFiles,busy,workerAvailable,connected}: {
  setup:MVPBuilderSetupInput; onChange:(v:Partial<MVPBuilderSetupInput>)=>void; onBuild:()=>void;
  hasFiles:boolean; busy:boolean; workerAvailable:boolean|null; connected:boolean;
}) {
  const [expanded,setExpanded]=useState(!hasFiles);
  const b=setup.buildBrief;
  const update=(patch:Partial<NonNullable<typeof b>>)=>{if(b)onChange({buildBrief:{...b,...patch},...(patch.delivery==='preview'?{workflow:undefined}:{})});};
  const choose=(kind:BuildType)=>{
    const isExample=b && Object.values(BUILD_TYPES).some(item=>item.example===b.idea);
    const next=createBuildBrief(isExample?BUILD_TYPES[kind].example:b?.idea || setup.customPrompt || BUILD_TYPES[kind].example,kind);
    next.customer=b?.customer || setup.coreCustomer || setup.validatedTargetSegment || '';
    onChange({buildBrief:next,workflow:undefined,customPrompt:next.idea});
  };
  const errors=buildBriefErrors(b);
  return <section aria-label="Plan your product" className="shrink-0 max-h-[52vh] overflow-auto border-b bg-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">{hasFiles?'Your product plan':'What would you like to build?'}</h2><p className="text-xs text-muted-foreground">Choose a starting point, describe the result, then review the price.</p></div><Button size="sm" variant="ghost" onClick={()=>setExpanded(!expanded)}>{expanded?'Collapse plan':'Edit plan'}</Button></div>
    {expanded && <div className="mt-3 space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{Object.entries(BUILD_TYPES).map(([id,item])=><button type="button" key={id} aria-pressed={b?.kind===id} onClick={()=>choose(id as BuildType)} className={'min-h-11 rounded-lg border p-2 text-left text-xs font-medium '+(b?.kind===id?'border-primary bg-primary/10':'hover:bg-muted')}>{item.label}</button>)}</div>
      {b && <>
        <div className="grid gap-3 md:grid-cols-3"><Label className="md:col-span-2">Describe your product<Textarea className="mt-1" value={b.idea} onChange={e=>update({idea:e.target.value})} maxLength={4000}/></Label><Label>Who is it for?<Input className="mt-1" value={b.customer} placeholder="For example, independent yoga teachers" onChange={e=>update({customer:e.target.value})} maxLength={500}/></Label><Label className="md:col-span-2">What should a user accomplish?<Input className="mt-1" value={b.task} onChange={e=>update({task:e.target.value})} maxLength={500}/></Label><Label>First three features<Textarea className="mt-1" value={b.features.join('\n')} onChange={e=>update({features:e.target.value.split('\n').slice(0,3)})}/></Label></div>
        <fieldset className="rounded-lg border p-3"><legend className="px-1 text-xs font-medium">Build mode</legend><label className="flex items-start gap-2 text-sm"><input type="radio" name="build-mode" checked={b.delivery==='preview'} onChange={()=>update({delivery:'preview'})}/><span>Build and try it first<span className="block text-xs text-muted-foreground">No database setup required. Preview and export the code. Connect services and pass launch checks before publishing.</span></span></label><label className="mt-2 flex items-start gap-2 text-sm"><input type="radio" name="build-mode" checked={b.delivery==='connected'} onChange={()=>update({delivery:'connected'})}/><span>Build with my connected database<span className="block text-xs text-muted-foreground">Use real saved records and sign-in. Requires your app database and public key.</span></span></label></fieldset>
        {b.kind==='landing' && <Label>Call-to-action URL (optional for the first draft)<Input type="url" value={b.ctaUrl || ''} onChange={e=>update({ctaUrl:e.target.value})} placeholder="https://..."/></Label>}
        {(b.kind==='store'||b.kind==='saas') && <Label>Hosted checkout URL (optional for the first draft)<Input type="url" value={b.checkoutUrl || ''} onChange={e=>update({checkoutUrl:e.target.value})} placeholder="https://..."/><span className="mt-1 block text-xs text-muted-foreground">Checkout remains unavailable until configured. A payment link does not implement multi-item order fulfillment or subscription access.</span></Label>}
        {b.kind==='app' && <p className="text-xs text-muted-foreground">Mobile means a responsive web app in this build. Native app-store releases and background notifications require additional infrastructure.</p>}
        {b.delivery==='connected' && !connected && <p role="status" className="text-xs text-amber-600">Open Database to connect your app project, or choose “Build and try it first”.</p>}
        {workerAvailable!==true && <p role="status" className="rounded-md bg-amber-500/10 p-2 text-xs">{workerAvailable===null?'Checking launch testing availability.':'Launch testing is currently offline. You can explicitly choose a preview/export build; a paid build will not make publishing available.'}</p>}
        {errors.length>0 && <p className="text-xs text-muted-foreground">{errors[0]}</p>}
        <Button disabled={busy||errors.length>0||(b.delivery==='connected'&&(!connected||workerAvailable!==true))} onClick={onBuild}>{busy?'Preparing...':hasFiles?'Review changes and price':'Review plan and price'}</Button>
      </>}
    </div>}
  </section>;
}
