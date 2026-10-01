import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import type { GTMPlay } from '@/lib/gtmV2';

export default function GTMReviewEvidence({ play, planId }: { play?: GTMPlay; planId: string }) {
  const [rows, setRows] = useState<any[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(false), [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;setRows([]);setError('');setLoading(false);
    if (!play?.tractionSprintId) return;
    setLoading(true);
    void (supabase as any).from('traction_engine_experiments').select('id,target_metric,target_value,result_value,sample_size,decision,traction_engine_weekly_logs!inner(week_start_date,calculation_version)').eq('sprint_id',play.tractionSprintId).eq('traction_engine_weekly_logs.calculation_version',2).order('created_at',{ascending:false}).limit(6).then(({data,error}:any) => {
      if (!active) return;setLoading(false);if(error)setError('Could not load this experiment’s saved results.');else setRows(data??[]);
    }).catch(() => {if(active){setLoading(false);setError('Could not load saved results.');}});
    return () => {active=false;};
  },[play?.tractionSprintId,refresh]);
  return <section className="space-y-3 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Results for {play?.channelName || 'your selected experiment'}</h3><Button size="sm" variant="outline" disabled={loading} onClick={() => setRefresh(value => value+1)}>Refresh saved results</Button></div>
    {loading && <p role="status" className="text-sm">Loading this experiment’s evidence…</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error} Use Refresh to try again.</p>}
    {!loading && !error && !rows.length && <p className="text-sm text-muted-foreground">No saved results yet. Record the sample, result and your decision in Traction, then return here. A weekly review uses completed observation periods.</p>}
    {rows.map(row => <article key={row.id} className="flex flex-wrap justify-between gap-3 border-t pt-3 text-sm"><div><p className="font-medium">Week of {row.traction_engine_weekly_logs.week_start_date}</p><p>{row.result_value} / {row.target_value} {row.target_metric} · Sample: {row.sample_size ?? 'Not recorded'}</p></div><p>{String(row.decision).replace(/_/g,' ')}</p></article>)}
    {play && <Button asChild variant="outline"><Link to={`/traction-engine?step=sprint&planId=${encodeURIComponent(planId)}&playId=${encodeURIComponent(play.id)}`}>Record or correct this experiment’s results</Link></Button>}
  </section>;
}
