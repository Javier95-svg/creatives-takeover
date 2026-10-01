import { supabase } from '@/integrations/supabase/client';

/** Export one product's historical records, with calculation methods and sources intact. */
export async function exportTractionReportPdf(userId: string, productId: string | null = null): Promise<void> {
  const db = supabase as any;
  const { data, error } = await db.from('traction_engine_weekly_logs').select('*').eq('user_id', userId)
    .filter('product_id', productId ? 'eq' : 'is', productId).order('week_start_date', { ascending: false }).limit(12);
  if (error) throw new Error('Could not load your traction history.');
  const logs = (data ?? []).reverse();
  if (!logs.length) throw new Error('Save your first week before exporting.');
  const ids = logs.map((l: any) => l.id);
  const [experiments, revisions, observations] = await Promise.all([
    db.from('traction_engine_experiments').select('*').eq('user_id',userId).in('weekly_log_id',ids),
    db.from('ct_traction_revisions').select('weekly_log_id,revision,created_at').eq('user_id',userId).in('weekly_log_id',ids).order('revision'),
    productId ? db.from('ct_metric_observations').select('*').eq('user_id',userId).eq('product_id',productId).order('period_end',{ascending:false}).limit(100) : Promise.resolve({data:[],error:null}),
  ]);
  if (experiments.error || revisions.error || observations.error) throw new Error('Could not load the source or revision history.');
  const { jsPDF } = await import('jspdf'); const doc = new jsPDF({unit:'pt',format:'a4'});
  const margin=48,width=doc.internal.pageSize.getWidth()-96; let y=48;
  const line=(text:string,size=9,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);const lines=doc.splitTextToSize(text,width);for(const value of lines){if(y>740){doc.addPage();y=48;}doc.text(value,margin,y);y+=size+5;}};
  line('Traction decision ledger',20,true);
  line('Creatives Takeover | Generated '+new Date().toISOString()+' | Reporting time zone: UTC');
  line('Product: '+(productId||'Unassigned historical work'));
  line('Version 2 separates execution discipline from customer outcomes. A score does not establish fundraising readiness. Historical version 1 scores use the legacy calculation and cannot be compared with version 2.'); y+=10;
  for(const log of logs){
    const v2=log.calculation_version===2,breakdown=log.score_breakdown||{};
    line('Week '+log.week_start_date+' | '+(v2?'Version 2':'Legacy version 1'),12,true);
    line((v2?'Execution discipline':'Legacy combined score')+': '+log.combined_score+'/100 | Consistency: '+log.consistency_score+' | Experiment documentation: '+log.experiment_quality_score);
    line('Activity counts (not retention): new users '+log.new_users+', 7-day active '+log.seven_day_active_users+', 30-day active '+log.thirty_day_active_users+'.');
    line('Founder-entered revenue: '+(log.revenue==null?'unknown':log.revenue+' (currency and revenue definition not specified)'));
    if(v2){const c=breakdown.cohort;line('Cohort retention: '+(breakdown.retentionStatus==='complete'?log.retention_health_score+'%':breakdown.retentionStatus||'unknown')+' | Source: '+(breakdown.retentionSource||'manual'));
      if(c){line('Starting event: '+c.startEvent+' | Returning event: '+c.returnEvent+' | Window: '+c.windowDays+' days');line('Observation period: '+c.periodStart+' to '+c.periodEnd+' | Returned: '+(c.returned??'unknown')+' / starting cohort: '+(c.cohortSize??'unknown'));
        if(breakdown.retentionStatus==='complete'&&Number(c.cohortSize)>0){if(y>720){doc.addPage();y=48;}doc.setFillColor(230,230,235);doc.rect(margin,y,width,8,'F');doc.setFillColor(45,110,150);doc.rect(margin,y,width*Math.min(1,Number(c.returned)/Number(c.cohortSize)),8,'F');y+=20;}}
      if(breakdown.observationId)line('Source observation: '+breakdown.observationId);
    }else line('Legacy retention used active/new user counts. It is not a measured retained-customer cohort.');
    for(const e of experiments.data.filter((e:any)=>e.weekly_log_id===log.id)){line(e.channel+': '+e.result_value+' / target '+e.target_value+' '+e.target_metric+' | Sample '+(e.sample_size??'unknown')+' | '+e.time_invested_hours+' founder hours');line('Decision: '+e.decision+(e.override_rationale?' | Rationale: '+e.override_rationale:''));}
    line('Revisions: '+(revisions.data.filter((r:any)=>r.weekly_log_id===log.id).map((r:any)=>r.revision+' at '+r.created_at).join('; ')||'Original historical record'));y+=12;
  }
  line('Recent connected source observations',12,true);
  for(const o of observations.data){line(o.metric+': '+(o.value??'unknown')+(o.denominator!=null?' / '+o.denominator:'')+' '+(o.currency||'')+' '+(o.definition?.unit||'')+' | '+o.status);line('Period '+o.period_start+' to '+o.period_end+' | Retrieved '+o.captured_at+' | '+o.provenance+' | Source ID '+o.source_key);}
  line('Net payments subtract recorded refunds from successful charges and group them by the original charge date. They are not recognized revenue or MRR. Order values use the original order date. Missing attribution is not inferred. Source provenance does not verify unrelated founder-entered results.');
  doc.save('traction-ledger-'+(productId||'unassigned')+'-'+new Date().toISOString().slice(0,10)+'.pdf');
}
