import {useEffect,useRef,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import type {MVPBuildBrief} from '../../../supabase/functions/_shared/mvp-build-brief';
import {deriveCapabilities} from '../../../supabase/functions/_shared/mvp-capabilities';
type SetupStatus={status:string;stage?:string;failure?:string;error?:string;configVersion?:number;runtime?:{url:string;publicKey:string;appId:string}};
export function MVPManagedSetup({projectId,brief,save,onReady}:{projectId:string;brief?:MVPBuildBrief;save:()=>Promise<boolean>;onReady?:(runtime:{url:string;publicKey:string;projectId:string})=>void}){
 const applied=useRef('');
 const [available,setAvailable]=useState(false),[state,setState]=useState<SetupStatus|null>(null),[busy,setBusy]=useState(false),[advancing,setAdvancing]=useState(false);
 const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
 const [expanded,setExpanded]=useState(false);
 const exportData=async()=>{
  setExporting(true);setExportError('');
  try{
   const {data,error}=await supabase.functions.invoke('mvp-managed-app',{body:{action:'export',projectId}});
   if(error||data?.error||!data?.schema||!data?.data)throw Error(data?.error||'Could not export app data. Retry when the connection is restored.');
   const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));
   const link=document.createElement('a');link.href=url;link.download='app-'+projectId+'-data-export.json';document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }catch(e){setExportError(e instanceof Error?e.message:'Export failed. Retry.');}finally{setExporting(false);}
 };
 useEffect(()=>{
  const identity=projectId+':'+state?.configVersion;
  if(state?.status==='ready'&&state.runtime&&state.runtime.appId===projectId&&applied.current!==identity){applied.current=identity;onReady?.({url:state.runtime.url,publicKey:state.runtime.publicKey,projectId});}
 },[state,projectId,onReady]);
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
   if(!error&&!data?.error){setState(data);if(data?.failure||['ready','review','failed'].includes(data?.status))setAdvancing(false);}
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
 return <section aria-label="App setup" className="border-b px-4 py-2 text-sm">
  {state?.status==='ready'&&!expanded?<div className="flex items-center justify-between"><p role="status">Sign-in and app data ready</p><Button variant="ghost" size="sm" onClick={()=>setExpanded(true)}>Manage app data</Button></div>:<>
  <p className="font-medium">{state?.stage||'Set up sign-in and saved data'}</p>
  <p className="text-xs text-muted-foreground">CT manages your app database. Your existing drafts and code export remain available.</p>
  {state&&!['not_started','ready','review','failed'].includes(state.status)&&<p className="mt-1 text-xs text-muted-foreground">Setup retries in the background. You can leave this page and return later.</p>}
  {state?.failure&&<p role="alert" className="mt-2 text-destructive">{state.failure}</p>}
  {state?.status==='ready'?<><p role="status" className="mt-2">App data and sign-in are ready. Check the current build before publishing. Use password recovery in your published app to set your owner password.</p><Button variant="outline" className="mt-2" size="sm" disabled={exporting} onClick={()=>void exportData()}>{exporting?'Exporting...':'Export app data and schema'}</Button>{exportError&&<p role="alert" className="mt-2 text-destructive">{exportError}</p>}</>:<Button className="mt-2" size="sm" disabled={busy||advancing||state?.status==='review'} onClick={()=>void run(!state||state.status==='not_started'?'setup':'advance')}>{busy||advancing?'Setting up...':!state||state.status==='not_started'?'Set up my app':'Continue setup'}</Button>}
 {state?.status==='ready'&&<Button variant="ghost" size="sm" onClick={()=>setExpanded(false)}>Hide details</Button>}
 </>}</section>;
}
