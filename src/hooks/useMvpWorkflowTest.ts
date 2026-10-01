import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
export interface WorkflowTestResult { id:string; revision:string; status:string; assertions:Record<string,boolean>; failure_details?:string; }
export function useMvpWorkflowTest(projectId:string, draft:string, save:()=>Promise<boolean>, fallback:boolean, unsaved=false) {
  const [result,setResult]=useState<WorkflowTestResult|null>(null);
  const [testing,setTesting]=useState(false);
  const [available,setAvailable]=useState<boolean|null>(null);
  const [profiles,setProfiles]=useState<string[]>([]);
  useEffect(()=>{
    let mounted=true;
    const check=async()=>{
      try {
        const {data,error}=await supabase.functions.invoke('mvp-workflow-tests',{body:{action:'status'}});
        if(mounted){setAvailable(!error && data?.available===true);setProfiles(Array.isArray(data?.profiles)?data.profiles:[]);}
      } catch {if(mounted)setAvailable(false);}
    };
    void check();
    const interval=setInterval(()=>void check(),60_000);
    return ()=>{mounted=false;clearInterval(interval);};
  },[]);
  const testedDraft=useRef('');
  const active=useRef(0);
  useEffect(()=>{active.current++;setResult(null);setTesting(false);},[projectId]);
  useEffect(()=>()=>{active.current++;},[]);
  // A finished result survives reopening. A local edit always invalidates it.
  useEffect(()=>{
    if(unsaved||testing||fallback)return;
    let alive=true;
    const timer=setTimeout(()=>{
      void (supabase as any).rpc('current_mvp_workflow_test',{p_project:projectId}).then(({data,error}:{data:WorkflowTestResult[]|null;error:unknown})=>{
        if(!alive||error)return;
        if(data?.[0]){testedDraft.current=draft;setResult(data[0]);}
        else setResult(null);
      });
    },400);
    return()=>{alive=false;clearTimeout(timer);};
  },[projectId,draft,unsaved,testing,fallback]);
  const run=async()=>{
    if (testing || fallback) return;
    if(available!==true){toast.error('Workflow testing is temporarily unavailable. Your saved app is safe.');return;}
    const request=++active.current;
    setTesting(true);
    try {
      if (!await save()) throw new Error('Save failed. Your workflow was not tested.');
      if(active.current!==request)return;
      const {data,error}=await supabase.functions.invoke('mvp-workflow-tests',{body:{action:'request',projectId}});
      if(error || !data?.id){
        let message=data?.error;
        if(!message&&error?.context instanceof Response){try{message=(await error.context.json()).error;}catch{}}
        throw new Error(message || 'The test service is unavailable. No credits were charged.');
      }
      if(active.current!==request)return;
      testedDraft.current=draft;
      const deadline=Date.now()+10*60_000;
      while(active.current===request && Date.now()<deadline){
        const {data:row,error:readError}=await (supabase as any).from('mvp_build_tests').select('id,revision,status,assertions,failure_details').eq('id',data.id).single();
        if(readError) throw new Error('Unable to read the test result. Retry later.');
        if(active.current!==request)return;
        setResult(row);
        if(row.status==='passed' || row.status==='failed')return;
        await new Promise(resolve=>setTimeout(resolve,2500));
      }
      if(active.current===request) throw new Error('The test took too long. Your saved draft is safe; try again later.');
    } catch(e){if(active.current===request) toast.error(e instanceof Error?e.message:'Test failed');}
    finally {if(active.current===request)setTesting(false);}
  };
  const dirty=!!result && (unsaved||testedDraft.current!==draft);
  return {run,result,testing,dirty,available,profiles,testRunId:!dirty && !fallback && !testing && result?.status==='passed'?result.id:null};
}
