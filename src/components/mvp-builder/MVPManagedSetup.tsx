import {useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import type {MVPBuildBrief} from '../../../supabase/functions/_shared/mvp-build-brief';
import {deriveCapabilities} from '../../../supabase/functions/_shared/mvp-capabilities';
type SetupStatus={status:string;stage?:string;failure?:string;error?:string};
export function MVPManagedSetup({projectId,brief,save}:{projectId:string;brief?:MVPBuildBrief;save:()=>Promise<boolean>}){
 const [available,setAvailable]=useState(false),[state,setState]=useState<SetupStatus|null>(null),[busy,setBusy]=useState(false),[advancing,setAdvancing]=useState(false);
 useEffect(()=>{
  let active=true;
  setAvailable(false);setState(null);setAdvancing(false);
  void supabase.functions.invoke('mvp-managed-app',{body:{action:'availability'}}).then(({data,error})=>{
   if(active&&!error)setAvailable(!!brief&&data?.available===true&&data.profiles.includes(deriveCapabilities(brief).profile));
  });
  return()=>{active=false;};
 },[projectId,brief?.kind,brief?.idea,brief?.task,JSON.stringify(brief?.features)]);
 useEffect(()=>{
  if(!available)return;
  let active=true,timer:ReturnType<typeof setTimeout>;
  const poll=async()=>{
   const {data,error}=await supabase.functions.invoke('mvp-managed-app',{body:{action:advancing?'advance':'status',projectId}});
   if(!active)return;
   if(!error){setState(data);if(data?.failure||['ready','review','failed'].includes(data?.status))setAdvancing(false);}
   else {setAdvancing(false);setState(current=>({...current,status:current?.status||'not_started',failure:'Setup could not continue. Your draft is safe; retry the current step.'}));}
   timer=setTimeout(()=>void poll(),5000);
  };
  void poll();return()=>{active=false;clearTimeout(timer);};
 },[available,projectId,advancing]);
 if(!available)return null;
 const run=async(action:string)=>{
  setBusy(true);
  try{
   if(action==='setup'&&!await save())throw Error('Save your plan, then retry setup.');
   const {data,error}=await supabase.functions.invoke('mvp-managed-app',{body:{action,projectId}});
   if(error||data?.error)throw Error(data?.error||'Setup could not complete. Your draft is safe; retry this step.');
   setState(data);
   setAdvancing(!data.failure&&!['ready','review','failed','static'].includes(data.status));
  }catch(e){setState(current=>({...current,status:current?.status||'not_started',failure:e instanceof Error?e.message:'Setup failed. Retry.'}));}
  finally{setBusy(false);}
 };
 return <section aria-label="App setup" className="border-b px-4 py-3 text-sm">
  <p className="font-medium">{state?.stage||'Set up sign-in and saved data'}</p>
  <p className="text-xs text-muted-foreground">CT manages your app database. Your existing drafts and code export remain available.</p>
  {state?.failure&&<p role="alert" className="mt-2 text-destructive">{state.failure}</p>}
  {state?.status==='ready'?<p role="status" className="mt-2">App data and sign-in are ready. The current build still needs its outcome check before publishing.</p>:<Button className="mt-2" size="sm" disabled={busy||advancing||state?.status==='review'} onClick={()=>void run(!state||state.status==='not_started'?'setup':'advance')}>{busy||advancing?'Setting up...':!state||state.status==='not_started'?'Set up my app':'Continue setup'}</Button>}
 </section>;
}
