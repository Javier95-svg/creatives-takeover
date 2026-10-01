import { captureEvent } from '@/lib/analytics';
import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function PMFConnectedEvidence({ productId, contextId, onAdded, onReview }: { productId: string; contextId: string | null; onAdded: () => Promise<void>; onReview?: () => void }) {
  const [rows,setRows]=useState<any[]>([]); const [selected,setSelected]=useState(''); const [screening,setScreening]=useState('');
  const [target,setTarget]=useState(false); const [busy,setBusy]=useState(false); const [rounds,setRounds]=useState<any[]>([]);
  useEffect(()=>{ let active=true; setRows([]);setSelected('');setRounds([]);
    if(productId&&contextId) void Promise.all([
      (supabase as any).from('ct_evidence').select('*').eq('product_id',productId).in('kind',['interview','survey','session']).order('captured_at',{ascending:false}).limit(100),
      (supabase as any).from('pmf_analysis_results').select('id,created_at,analysis_data').eq('validation_context_id',contextId).order('created_at',{ascending:false}).limit(2),
    ]).then(([e,r])=>{if(active){if(e.error)toast.error('Could not load imported evidence.');setRows(e.data??[]);setRounds(r.data??[]);}});
    return()=>{active=false;};
  },[productId,contextId]);
  if(!productId||!contextId)return null;
  const row=rows.find(r=>r.id===selected);
  return <section className="space-y-3 rounded-xl border p-4"><h3 className="font-semibold">Imported feedback and validation rounds</h3>{import.meta.env.VITE_VALIDATION_SESSIONS_ENABLED === 'true' && <Button asChild variant="outline"><Link to={`/validation-sessions?context=${contextId}&product=${productId}`}>Book a validation session</Link></Button>}
    <p className="text-sm text-muted-foreground">Review original feedback and confirm customer fit. General reviewer feedback helps clarity; only screened target customers enter demand assessment. Repeated respondents count once per context.</p>
    <select aria-label="Imported feedback" className="w-full rounded border bg-background p-2" value={selected} onChange={e=>{setSelected(e.target.value);setTarget(false);setScreening('');}}><option value="">Choose feedback ({rows.length} recent records)</option>{rows.map(r=><option key={r.id} value={r.id}>{r.summary.respondent||r.summary.source} · {new Date(r.captured_at).toLocaleDateString()} · {r.incentivized?'Incentivized':'No incentive recorded'}</option>)}</select>
    {row&&<><p className="text-sm whitespace-pre-wrap">{row.summary.feedback||'No feedback mapped. Update the import mapping in Connections.'}</p><p className="text-xs">Segment: {row.segment||'Unknown'} · Product use: {row.product_usage} · Source: {row.provenance}</p>
      <details><summary className="cursor-pointer text-sm">Original feedback</summary><pre className="max-h-64 overflow-auto whitespace-pre-wrap text-xs">{JSON.stringify(row.original,null,2)}</pre></details>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={target} onChange={e=>setTarget(e.target.checked)}/>This person fits the target customer</label>
      {target&&<Input aria-label="Customer fit evidence" placeholder="Their role, problem experienced, and why they are a potential buyer or user" value={screening} onChange={e=>setScreening(e.target.value)}/>}
      <Button disabled={busy||!row.summary.feedback||(target&&screening.trim().length<20)} onClick={async()=>{setBusy(true);try{const {error}=await(supabase as any).rpc('ct_accept_pmf_evidence',{p_context:contextId,p_evidence:row.id,p_target_customer:target,p_screening:screening});if(error)throw error;await onAdded();captureEvent('ct_pmf_import_added',{product_id:productId,context_id:contextId,target_customer:target,incentivized:row.incentivized});toast.success('Evidence added. Re-score this validation context to review what changed.');}catch(e){toast.error(e instanceof Error?e.message:'Could not add evidence.');}finally{setBusy(false);}}}>Add to this validation context</Button></>}
    {onReview&&<Button variant="outline" onClick={onReview}>Review updated evidence and re-score</Button>}
    {rounds.length>0&&<details><summary className="cursor-pointer text-sm">Compare latest validation rounds</summary><div className="grid gap-3 md:grid-cols-2">{rounds.map((r,i)=><article key={r.id} className="space-y-2 rounded border p-3 text-sm"><h4 className="font-medium">{i===0?'Latest':'Previous'} ? {new Date(r.created_at).toLocaleDateString()}</h4><p>{r.analysis_data?.summaryInsight||'Open the saved assessment for the full decision.'}</p><p><strong>Decision:</strong> {r.analysis_data?.decision||'Not recorded'} ? Score {r.analysis_data?.overallScore??'Unknown'}</p><p><strong>Objections:</strong> {(r.analysis_data?.commonObjections||[]).join('; ')||'None recorded'}</p><p><strong>Demand behaviors:</strong> {(r.analysis_data?.buyingSignals||[]).join('; ')||'None recorded'}</p><p><strong>Segments represented:</strong> {[...new Set((r.analysis_data?.evidenceAnswers?.interviews||[]).map((interview:any)=>interview.segment).filter(Boolean))].join(', ')||'Unknown'}</p><p><strong>Next test:</strong> {r.analysis_data?.nextExperiment||'Not recorded'}</p>{r.analysis_data?.decisionChange?.explanation&&<p>{r.analysis_data.decisionChange.explanation}</p>}</article>)}</div></details>}
  </section>;
}
