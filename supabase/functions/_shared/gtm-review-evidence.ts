export function reviewEvidence(rows:any[],metric:string,rule:{observationWindowWeeks?:number;minSampleSize?:number}|undefined,weekStart:string){
 const weeks=Math.max(1,Math.min(6,Number(rule?.observationWindowWeeks)||1));
 const end=Date.parse(weekStart+'T00:00:00Z'),start=end-weeks*604800000;
 const history=rows.filter(row=>String(row.target_metric).trim().toLowerCase()===metric.trim().toLowerCase()&&Date.parse(row.traction_engine_weekly_logs?.week_start_date)>=start&&Date.parse(row.traction_engine_weekly_logs?.week_start_date)<end)
   .sort((a,b)=>String(b.traction_engine_weekly_logs.week_start_date).localeCompare(String(a.traction_engine_weekly_logs.week_start_date)));
 const periods=new Set(history.map(row=>row.traction_engine_weekly_logs.week_start_date));
 const sample=history.reduce((n,row)=>n+Math.max(0,Number(row.sample_size)||0),0);
 const sufficient=periods.size>=weeks&&sample>=Math.max(1,Number(rule?.minSampleSize)||1);
 const decisions=new Set(history.map(row=>row.decision));
 const decision=!sufficient?'collect_evidence':decisions.size===1&&decisions.has('kill')?'kill':history.every(row=>row.pass===true)&&decisions.has('double_down')?'double_down':'iterate';
 return {history,sample,sufficient,decision,windowStart:new Date(start).toISOString().slice(0,10),windowEnd:weekStart,weeks};
}
