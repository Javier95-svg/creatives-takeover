import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { getCorsHeaders } from '../_shared/middleware.ts';
import { clientIp, denied, rateLimit, requireUser, serviceClient } from '../_shared/guards.ts';
import { deterministicSections, finalizedSnapshot, normalizeSections, type Audience, type EvidenceItem } from '../_shared/investor-update.ts';

const json = (req: Request, body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...getCorsHeaders(req), 'Content-Type': 'application/json' } });
const validAudience = (value: unknown): value is Audience => value === 'stakeholder' || value === 'fundraising';
const validId = (value: unknown) => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(value);
const asRecord = (value: unknown) => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

function monthRange(month: unknown) {
  if (typeof month !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, number] = month.split('-').map(Number);
  const start = `${month}-01`;
  const end = new Date(Date.UTC(year, number, 0)).toISOString().slice(0, 10);
  return { start, end };
}

async function evidenceFor(userId: string, start: string, end: string, timezoneHint: string) {
  const db = serviceClient();
  const boundsResult=await db.rpc('investor_update_period_bounds_v1',{p_user_id:userId,p_period_start:start,p_timezone_hint:timezoneHint});
  if(boundsResult.error||!boundsResult.data)throw new Error('period_bounds_unavailable');
  const bounds=asRecord(boundsResult.data); const startAt=String(bounds.startAt); const endAt=String(bounds.endAt); const timezone=String(bounds.timezone||'UTC');
  const previousEnd = new Date(`${start}T00:00:00Z`); previousEnd.setUTCDate(0);
  const previousStart = new Date(Date.UTC(previousEnd.getUTCFullYear(), previousEnd.getUTCMonth(), 1));
  const [profile, traction, previous, metrics, goals, journey, readiness, pitch, customerEvidence, pmf] = await Promise.all([
    db.from('profiles').select('startup_name,startup_description,assigned_stage,user_type,user_preferences').eq('id', userId).single(),
    db.from('traction_engine_weekly_logs').select('id,week_start_date,combined_score,new_users,seven_day_active_users,thirty_day_active_users,revenue,primary_acquisition_channel,score_breakdown,phase_seven_ready').eq('user_id', userId).gte('week_start_date', start).lte('week_start_date', end).order('week_start_date'),
    db.from('traction_engine_weekly_logs').select('combined_score,new_users,seven_day_active_users,thirty_day_active_users,revenue').eq('user_id', userId).gte('week_start_date', previousStart.toISOString().slice(0,10)).lte('week_start_date', previousEnd.toISOString().slice(0,10)).order('week_start_date'),
    db.from('business_metrics').select('metric_date,revenue,customers_count,active_users').eq('user_id', userId).gte('metric_date', start).lte('metric_date', end).order('metric_date'),
    db.from('kpi_goals').select('goal_name,current_value,target_value,unit,updated_at').eq('user_id', userId).eq('is_active', true).gte('updated_at',startAt).lt('updated_at',endAt).limit(10),
    db.from('journey_stage_runs').select('stage,artifact_state,outcome_state,branch_reason,evidence_summary,updated_at').eq('user_id', userId).in('stage', ['repeat','capital']).gte('updated_at',startAt).lt('updated_at',endAt).order('updated_at', { ascending: false }).limit(10),
    db.from('fundraising_readiness_assessments').select('*').eq('user_id', userId).lt('created_at',endAt).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('pitch_deck_analyses').select('id,overall_score,verdict,created_at').eq('user_id', userId).lt('created_at',endAt).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('customer_evidence_events').select('event_type,verification_mode,amount,currency,occurred_at').eq('user_id',userId).gte('occurred_at',startAt).lt('occurred_at',endAt).order('occurred_at').limit(100),
    db.from('pmf_analysis_results').select('pmf_score,verdict,confidence_level,created_at').eq('user_id',userId).lt('created_at',endAt).order('created_at',{ascending:false}).limit(1).maybeSingle(),
  ]);
  if (profile.error || !profile.data) throw new Error('profile_unavailable');
  const p = profile.data as Record<string, unknown>;
  const rows = (traction.data ?? []) as Array<Record<string, unknown>>;
  const priorRows = (previous.data ?? []) as Array<Record<string, unknown>>;
  const average = (items: Array<Record<string, unknown>>, key: string) => items.length ? items.reduce((sum, row) => sum + Number(row[key] ?? 0), 0) / items.length : null;
  const pct = (current: number | null, prior: number | null) => current !== null && prior ? Math.round(((current - prior) / Math.abs(prior)) * 1000) / 10 : null;
  const retentionSources = rows.map((row) => String(asRecord(row.score_breakdown).retentionSource ?? ''));
  const retentionQuality = retentionSources.length > 0 && retentionSources.every((source) => source === 'platform')
    ? 'platform-verified'
    : retentionSources.some((source) => source === 'platform' || source === 'corroborated')
      ? 'corroborated'
      : 'founder-reported';
  const evidence: EvidenceItem[] = [];
  const add = (item: EvidenceItem) => evidence.push(item);
  const score = average(rows, 'combined_score'); const priorScore = average(priorRows, 'combined_score');
  add({ key:'traction.score', label:'Average traction score', value:score === null ? null : Math.round(score), quality:score === null ? 'missing' : 'platform-verified', source:'Traction Engine weekly snapshots', change:pct(score, priorScore) });
  for (const [key,label] of [['new_users','New users'],['seven_day_active_users','7-day active users'],['thirty_day_active_users','30-day active users'],['revenue','Recorded revenue']] as const) {
    const current = average(rows,key); const prior = average(priorRows,key);
    const sourceQuality = key === 'seven_day_active_users' || key === 'thirty_day_active_users' ? retentionQuality : 'founder-reported';
    add({ key:`traction.${key}`, label, value:current === null ? null : Math.round(current * 100) / 100, quality:current === null ? 'missing' : sourceQuality, source:'Traction Engine saved weekly log', change:pct(current,prior) });
  }
  const logIds = rows.map((row) => row.id as string).filter(Boolean);
  if (logIds.length) {
    const experiments = await db.from('traction_engine_experiments').select('id,channel,hypothesis,result_value,decision,pass,created_at').eq('user_id',userId).in('weekly_log_id',logIds).limit(20);
    for (const row of (experiments.data ?? []) as Array<Record<string, unknown>>) add({ key:`experiment.${row.id}`, label:`${row.channel} experiment decision`, value:String(row.decision).replaceAll('_',' '), quality:'founder-reported', source:'Saved Traction Engine experiment', observedAt:String(row.created_at ?? '') });
  }
  for (const row of (metrics.data ?? []) as Array<Record<string, unknown>>) for (const key of ['revenue','customers_count','active_users']) if (row[key] != null) add({ key:`metric.${key}.${row.metric_date}`, label:key.replaceAll('_',' '), value:Number(row[key]), quality:'founder-reported', source:'Core Metrics snapshot', observedAt:String(row.metric_date) });
  for (const row of (goals.data ?? []) as Array<Record<string, unknown>>) add({ key:`metric.goal.${row.goal_name}`, label:`KPI current value — ${row.goal_name}`, value:row.current_value == null ? null : `${row.current_value}${row.unit ? ` ${row.unit}` : ''}`, quality:row.current_value == null ? 'missing' : 'founder-reported', source:'KPI goal current value (target is not treated as achieved)', observedAt:String(row.updated_at ?? '') });
  for (const row of (journey.data ?? []) as Array<Record<string, unknown>>) if (['achieved','verified'].includes(String(row.outcome_state))) add({ key:`milestone.${row.stage}`, label:`${row.stage} stage outcome`, value:String(row.outcome_state), quality:row.outcome_state === 'verified' ? 'platform-verified' : 'corroborated', source:'Outcome Journey stage run', observedAt:String(row.updated_at ?? '') });
  const customerRows = (customerEvidence.data ?? []) as Array<Record<string, unknown>>;
  const customerCounts = new Map<string,{count:number;quality:'platform-verified'|'corroborated'|'founder-reported'}>();
  for (const row of customerRows) {
    const key=String(row.event_type); const mode=String(row.verification_mode);
    const rowQuality=mode==='platform_verified'?'platform-verified':mode==='customer_action'||mode==='transaction'?'corroborated':'founder-reported';
    const current=customerCounts.get(key); const rank={'founder-reported':1,'corroborated':2,'platform-verified':3};
    customerCounts.set(key,{count:(current?.count??0)+1,quality:current&&rank[current.quality]>rank[rowQuality]?current.quality:rowQuality});
  }
  for (const [key,value] of customerCounts) add({key:`customer.${key}`,label:key.replaceAll('_',' '),value:value.count,quality:value.quality,source:'Customer evidence event ledger'});
  const pmfRow=pmf.data as Record<string,unknown>|null;
  if(pmfRow) add({key:'customer.pmf',label:'Latest PMF analysis',value:pmfRow.pmf_score==null?(pmfRow.verdict??'recorded'):`Score ${pmfRow.pmf_score}${pmfRow.verdict?` — ${pmfRow.verdict}`:''}`,quality:'founder-reported',source:'PMF Lab analysis of founder-provided evidence',observedAt:String(pmfRow.created_at??'')});
  const ready = readiness.data as Record<string, unknown> | null;
  if (ready) add({ key:'readiness.latest', label:'Fundraising readiness assessment', value:ready.average_score ?? ready.verdict ?? 'recorded', quality:'founder-reported', source:'Latest fundraising-readiness assessment', observedAt:String(ready.created_at ?? '') });
  const deck = pitch.data as Record<string, unknown> | null;
  add({ key:'pitch.latest', label:'Pitch-deck analysis', value:deck ? (deck.verdict ?? (deck.overall_score == null ? 'recorded' : `Score ${deck.overall_score}`)) as string : null, quality:deck ? 'platform-verified' : 'missing', source:'Pitch Deck Analyzer', observedAt:deck ? String(deck.created_at ?? '') : null });
  return { company:{ name:String(p.startup_name || 'Company'), description:typeof p.startup_description === 'string' ? p.startup_description : null }, stage:p.assigned_stage ?? null, timezone, evidence, missing:evidence.filter((item)=>item.quality==='missing').map((item)=>item.key) };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers:getCorsHeaders(req) });
  if (req.method !== 'POST') return denied(req,405,'Method not allowed');
  const auth = await requireUser(req); if (auth.error) return auth.error;
  const limited = await rateLimit(req,`investor-update:${auth.user.id}:${clientIp(req)}`,20,auth.user.id); if (limited) return limited;
  const db = serviceClient();
  const access = await db.rpc('can_use_investor_updates_v1',{p_user_id:auth.user.id});
  if (access.error || access.data !== true) return denied(req,403,'Investor Updates is not enabled for this account');
  let body: Record<string, unknown>; try { body = asRecord(await req.json()); } catch { return denied(req,400,'Invalid JSON'); }
  const action = String(body.action ?? 'list');
  try {
    if (action === 'list') {
      const result = await db.from('investor_updates').select('id,period_start,period_end,audience,revision,status,title,sections,evidence_snapshot,finalized_snapshot,finalized_at,shared_at,updated_at').eq('user_id',auth.user.id).order('period_start',{ascending:false}).order('revision',{ascending:false}).limit(24);
      if (result.error) throw result.error; return json(req,{reports:result.data});
    }
    if (action === 'preview' || action === 'generate') {
      const range=monthRange(body.month); if(!range||!validAudience(body.audience)) return denied(req,400,'Valid month and audience are required');
      const snapshot=await evidenceFor(auth.user.id,range.start,range.end,String(body.timezone||'UTC').slice(0,64));
      if(action==='preview') return json(req,snapshot);
      const existing=await db.from('investor_updates').select('id,revision,status').eq('user_id',auth.user.id).eq('period_start',range.start).eq('audience',body.audience).order('revision',{ascending:false}).limit(1).maybeSingle();
      if(existing.data?.status==='draft') return json(req,{reportId:existing.data.id,reused:true});
      const revision=(existing.data?.revision ?? 0)+1; const title=`${snapshot.company.name} — ${body.audience==='fundraising'?'Fundraising':'Stakeholder'} Update — ${String(body.month)}`;
      const inserted=await db.from('investor_updates').insert({user_id:auth.user.id,period_start:range.start,period_end:range.end,timezone:snapshot.timezone,audience:body.audience,revision,title,sections:deterministicSections(body.audience,snapshot.company,snapshot.evidence),evidence_snapshot:snapshot}).select('id').single();
      if(inserted.error) throw inserted.error; return json(req,{reportId:inserted.data.id});
    }
    if (!validId(body.reportId)) return denied(req,400,'Valid report ID required');
    const found=await db.from('investor_updates').select('*').eq('id',body.reportId).eq('user_id',auth.user.id).single(); if(found.error||!found.data) return denied(req,404,'Report not found');
    const report=found.data as Record<string,unknown>;
    if(action==='save') {
      if(report.status!=='draft') return denied(req,409,'Finalized reports cannot be edited; create a new revision');
      const sections=normalizeSections(body.sections); const updated=await db.from('investor_updates').update({sections}).eq('id',body.reportId).eq('user_id',auth.user.id).eq('status','draft'); if(updated.error) throw updated.error; return json(req,{ok:true,sections});
    }
    if(action==='finalize') {
      if(report.status!=='draft') return denied(req,409,'Only a draft can be finalized');
      const sections=normalizeSections(body.sections ?? report.sections); const now=new Date().toISOString(); const snapshot=finalizedSnapshot({audience:report.audience as Audience,title:String(report.title),periodStart:String(report.period_start),periodEnd:String(report.period_end),sections,evidence:(asRecord(report.evidence_snapshot).evidence ?? []) as EvidenceItem[],finalizedAt:now});
      const updated=await db.from('investor_updates').update({sections,status:'finalized',finalized_at:now,finalized_snapshot:snapshot}).eq('id',body.reportId).eq('user_id',auth.user.id).eq('status','draft'); if(updated.error) throw updated.error; return json(req,{ok:true,snapshot});
    }
    if(action==='share') {
      if(report.status!=='finalized') return denied(req,409,'Finalize the report before sharing');
      const days=body.expiresInDays==null?null:Number(body.expiresInDays); if(days!==null&&![7,30,90].includes(days)) return denied(req,400,'Expiration must be 7, 30, 90 days, or none');
      const bytes=crypto.getRandomValues(new Uint8Array(32)); const token=btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replaceAll('=',''); const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map((b)=>b.toString(16).padStart(2,'0')).join('');
      await db.from('investor_update_shares').update({revoked_at:new Date().toISOString()}).eq('report_id',body.reportId).is('revoked_at',null);
      const created=await db.from('investor_update_shares').insert({report_id:body.reportId,user_id:auth.user.id,token_hash:hash,expires_at:days?new Date(Date.now()+days*86400000).toISOString():null}).select('id,expires_at').single(); if(created.error) throw created.error;
      const marked=await db.from('investor_updates').update({shared_at:new Date().toISOString()}).eq('id',body.reportId); if(marked.error)throw marked.error; return json(req,{shareId:created.data.id,token,expiresAt:created.data.expires_at});
    }
    if(action==='revoke') { const result=await db.from('investor_update_shares').update({revoked_at:new Date().toISOString()}).eq('report_id',body.reportId).eq('user_id',auth.user.id).is('revoked_at',null); if(result.error)throw result.error; return json(req,{ok:true}); }
    return denied(req,400,'Unknown action');
  } catch(error) { console.error('[investor-update]',action,error instanceof Error?error.message:'failed'); const message=error instanceof Error&&error.message==='profile_unavailable'?error.message:'Investor update operation failed'; return denied(req,500,message); }
});
