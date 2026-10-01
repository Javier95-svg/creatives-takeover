import {useEffect,useState} from 'react';
import {supabase} from '@/integrations/supabase/client';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {checkedPreviewDocument} from '@/lib/mvp-builder/checkedPreview';
export function MVPCheckedPreview({testRunId}:{testRunId:string|null}){
 const [open,setOpen]=useState(false),[document,setDocument]=useState(''),[error,setError]=useState('');
 useEffect(()=>{setOpen(false);setDocument('');setError('');},[testRunId]);
 useEffect(()=>{
  if(!open||!testRunId)return;
  let alive=true;setDocument('');setError('');
  void (supabase as any).rpc('review_mvp_test_artifact',{p_test:testRunId}).then(({data,error}:{data:{filename:string;content:string}[];error:{message?:string}|null})=>{
   if(!alive)return;
   if(error){setError(error.message||'Could not open this build. Check the saved app again.');return;}
   try{setDocument(checkedPreviewDocument(data));}catch(e){setError(e instanceof Error?e.message:'Could not display the checked build.');}
  }).catch(()=>{if(alive)setError('Could not open the checked build. Close this view and retry.');});return()=>{alive=false;};
 },[open,testRunId]);
 if(!testRunId)return null;
 return <><Button className="self-start mx-4 my-2" size="sm" variant="outline" onClick={()=>setOpen(true)}>View checked build</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-w-5xl"><DialogHeader><DialogTitle>Your checked build</DialogTitle></DialogHeader><p className="text-xs text-muted-foreground">This uses the files approved for publication. Live connections, submissions and external navigation are disabled in this isolated review.</p>{error?<p role="alert">{error}</p>:document?<iframe title="Checked app preview" className="h-[65vh] w-full border rounded" sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={document}/>:<p role="status">Opening the checked build...</p>}</DialogContent></Dialog></>;
}
