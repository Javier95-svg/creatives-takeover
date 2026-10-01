import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
export interface WorkflowTestResult { id:string; revision:string; status:string; assertions:Record<string,boolean>; failure_details?:string; }
export function useMvpWorkflowTest(projectId:string, draft:string, save:()=>Promise<boolean>, fallback:boolean) {
  const [result,setResult]=useState<WorkflowTestResult|null>(null);
  const [testing,setTesting]=useState(false);
  const [available,setAvailable]=useState<boolean|null>(null);
  useEffect(()=>{
    let mounted=true;
    const check=async()=>{
      try {
        const {data,error}=await supabase.functions.invoke('mvp-workflow-tests',{body:{action:'status'}});
        if(mounted)setAvailable(!error && data?.available===true);
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
  const run=async()=>{
    if (testing || fallback) return;
    if(available!==true){toast.error('Workflow testing is temporarily unavailable. Your saved app is safe.');return;}
    const request=++active.current;
    setTesting(true);
    try {
      if (!await save()) throw new Error('Save failed. Your workflow was not tested.');
      const {data,error}=await supabase.functions.invoke('mvp-workflow-tests',{body:{action:'request',projectId}});
      if(error || !data?.id) throw new Error(data?.error || 'The test service is unavailable. No credits were charged.');
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
  const dirty=!!result && testedDraft.current!==draft;
  return {run,result,testing,dirty,available,testRunId:!dirty && !fallback && result?.status==='passed'?result.id:null};
}
