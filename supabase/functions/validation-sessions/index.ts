import { coreGoogleConfig } from '../_shared/core-google-config.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.55.0';
import { sealSecret,openSecret } from '../_shared/connection-secrets.ts';
import { identityOverlap,validateFeedback,type IdentitySession } from '../_shared/validation-attendance.ts';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'Content-Type':'application/json'}});
const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const check=(r:any)=>{if(r.error)throw new Error(r.error.message);return r.data;};
const callback=()=>`${Deno.env.get('SUPABASE_URL')}/functions/v1/validation-sessions`;
const app=()=>Deno.env.get('PUBLIC_APP_URL')||'https://creatives-takeover.com';
async function hash(value:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value))),b=>b.toString(16).padStart(2,'0')).join('');}
async function google(url:string,token:string,method='GET',body?:any){const r=await fetch(url,{method,redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error(`Google request failed (${r.status}). Check Calendar and Meet permissions.`);return r.status===204?{}:r.json();}
async function access(userId:string){const a=check(await db.from('ct_validation_google_accounts').select('*').eq('user_id',userId).single());const secret=await openSecret(a.encrypted_secret);const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:coreGoogleConfig(Deno.env.get).clientId,client_secret:coreGoogleConfig(Deno.env.get).clientSecret,refresh_token:secret.refresh_token,grant_type:'refresh_token'}),signal:AbortSignal.timeout(15000)});const body=await r.json();if(!r.ok||!body.access_token)throw new Error('Reconnect Google Calendar.');return {token:body.access_token,account:a};}
async function list(path:string,key:string,token:string){const rows:any[]=[];let page='';for(let i=0;i<30;i++){const u=new URL(`https://meet.googleapis.com/v2/${path}`);u.searchParams.set('pageSize','100');if(page)u.searchParams.set('pageToken',page);const data=await google(u.toString(),token);rows.push(...(data[key]??[]));if(!data.nextPageToken)return rows;if(data.nextPageToken===page)throw new Error('Meet pagination did not advance.');page=data.nextPageToken;}throw new Error('Meet returned too many records; attendance needs review.');}
async function calendar(s:any){
 const {token}=await access(s.founder_id);const eventId=s.calendar_id||s.id.replaceAll('-','');const base='https://www.googleapis.com/calendar/v3/calendars/primary/events';
 if(s.status==='cancelled'){if(s.calendar_id){const response=await fetch(`${base}/${eventId}?sendUpdates=all`,{method:'DELETE',headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(20000)});if(![204,404,410].includes(response.status))throw new Error('Calendar cancellation failed.');}check(await db.from('ct_validation_sessions').update({calendar_state:'synced',calendar_error:null}).eq('id',s.id));return;}
 const reviewer=s.reviewer_id?(await db.auth.admin.getUserById(s.reviewer_id)).data.user?.email:s.guest_email;
 const body={summary:'CT validation session',description:`25 minutes: problem discovery (5), pitch or demo (5), questions (10), feedback (5). Record recent behavior before the pitch. Manage your session and feedback at ${app()}/validation-sessions.`,start:{dateTime:s.starts_at,timeZone:'UTC'},end:{dateTime:new Date(Date.parse(s.starts_at)+25*60000).toISOString(),timeZone:'UTC'},attendees:reviewer?[{email:reviewer}]:[],reminders:{useDefault:false,overrides:[{method:'email',minutes:1440},{method:'popup',minutes:60}]}};
 let event;
 if(s.calendar_id)event=await google(`${base}/${eventId}?conferenceDataVersion=1&sendUpdates=all`,token,'PATCH',body);
 else {const response=await fetch(`${base}?conferenceDataVersion=1&sendUpdates=all`,{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({...body,id:eventId,conferenceData:{createRequest:{requestId:s.id,conferenceSolutionKey:{type:'hangoutsMeet'}}}}),signal:AbortSignal.timeout(20000)});
  if(response.status===409)event=await google(`${base}/${eventId}`,token);else{if(!response.ok)throw new Error(`Calendar booking failed (${response.status}).`);event=await response.json();}}
 const meet=event.hangoutLink||event.conferenceData?.entryPoints?.find((p:any)=>p.entryPointType==='video')?.uri;
 check(await db.from('ct_validation_sessions').update({calendar_id:eventId,meet_url:meet||null,calendar_state:meet?'synced':'pending',calendar_error:null}).eq('id',s.id));
}
async function attendance(s:any){
 const {token,account}=await access(s.founder_id);const reviewer=s.reviewer_id?check(await db.from('ct_validation_google_accounts').select('google_subject').eq('user_id',s.reviewer_id).maybeSingle()):null;
 const code=s.meet_url?.match(/^https:\/\/meet\.google\.com\/([a-z-]+)$/)?.[1];if(!code)throw new Error('Meeting details unavailable.');
 const records=await list(`conferenceRecords?filter=${encodeURIComponent(`space.meeting_code = "${code}"`)}`,'conferenceRecords',token);
 const record=records.find((r:any)=>r.endTime&&Date.parse(r.startTime)<Date.parse(s.starts_at)+25*60000&&Date.parse(r.endTime)>Date.parse(s.starts_at));
 if(!record){if(Date.now()<Date.parse(s.starts_at)+72*3600000)return;throw new Error('Attendance data did not arrive within 72 hours.');}
 const participants=await list(`${record.name}/participants`,'participants',token);const sessions:IdentitySession[]=[];
 for(const participant of participants){const subject=participant.signedinUser?.user?.replace(/^users\//,'')||null;const entries=await list(`${participant.name}/participantSessions`,'participantSessions',token);sessions.push(...entries.map((r:any)=>({subject,startTime:r.startTime,endTime:r.endTime||null})));}
 const result=identityOverlap(sessions,account.google_subject,reviewer?.google_subject||null,s.starts_at);
 check(await db.from('ct_validation_sessions').update({attendance_status:result.status,overlap_seconds:result.overlapSeconds,status:result.status==='verified'?'completed':'review',attendance_evidence:{conference:record.name,checkedAt:new Date().toISOString(),identitiesMatched:result.status==='verified'},...(result.status==='review'?{review_reason:'Booked identities or 15-minute overlap could not be verified'}:{})}).eq('id',s.id));
}
serve(async req=>{
 if(req.method==='OPTIONS')return new Response(null,{headers:cors});
 try{
  if(Deno.env.get('VALIDATION_SESSIONS_ENABLED')!=='true')return json({error:'Validation sessions are not enabled for this release.'},503);
  const url=new URL(req.url);
  if(req.method==='GET'){
   const state=url.searchParams.get('state'),code=url.searchParams.get('code');if(!state||!code)throw new Error('Authorization was cancelled.');
   const saved=check(await db.from('ct_validation_oauth_states').delete().eq('state',state).gt('expires_at',new Date().toISOString()).select('*').single());
   const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({code,client_id:coreGoogleConfig(Deno.env.get).clientId,client_secret:coreGoogleConfig(Deno.env.get).clientSecret,redirect_uri:callback(),grant_type:'authorization_code'}),signal:AbortSignal.timeout(15000)});const tokens=await response.json();if(!response.ok||!tokens.refresh_token)throw new Error('Approve ongoing Calendar and Meet access to continue.');
   const identity=await google('https://openidconnect.googleapis.com/v1/userinfo',tokens.access_token);if(!identity.sub||!identity.email_verified)throw new Error('Use a verified Google account.');
   check(await db.from('ct_validation_google_accounts').upsert({user_id:saved.user_id,google_subject:identity.sub,email:identity.email,encrypted_secret:await sealSecret({refresh_token:tokens.refresh_token})}));
   return new Response(null,{status:302,headers:{Location:`${app()}/validation-sessions`}});
  }
  const bearer=req.headers.get('Authorization')?.replace(/^Bearer /,'')||'';const body=await req.json();
  if(body.action==='worker'){
   if(bearer!==Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')&&!(Deno.env.get('CORE_TOOLS_CRON_SECRET')&&req.headers.get('x-core-cron-secret')===Deno.env.get('CORE_TOOLS_CRON_SECRET')))return json({error:'Unauthorized'},401);
   const pending=check(await db.from('ct_validation_sessions').select('*').in('calendar_state',['pending','error']).neq('status','invited').limit(10));
   for(const s of pending)try{await calendar(s);}catch(e){await db.from('ct_validation_sessions').update({calendar_state:'error',calendar_error:e instanceof Error?e.message:'Calendar unavailable'}).eq('id',s.id);}
   const ended=check(await db.from('ct_validation_sessions').select('*').eq('attendance_status','pending').eq('status','booked').lt('starts_at',new Date(Date.now()-30*60000).toISOString()).limit(10));
   for(const s of ended)try{await attendance(s);}catch(e){await db.from('ct_validation_sessions').update({attendance_status:'review',status:'review',review_reason:e instanceof Error?e.message:'Attendance requires review'}).eq('id',s.id);}
   const held=check(await db.from('ct_validation_sessions').select('id').eq('reward_status','held').lt('reward_eligible_at',new Date().toISOString()).limit(50));
   for(const s of held)check(await db.rpc('ct_grant_validation_reward',{p_session:s.id}));
   return json({success:true});
  }
  if(body.guestToken){
   if(typeof body.guestToken!=='string'||body.guestToken.length>100)throw new Error('Invalid invitation.');
   const s=check(await db.from('ct_validation_sessions').select('*').eq('guest_token_hash',await hash(body.guestToken)).gt('guest_expires_at',new Date().toISOString()).single());
   if(body.action==='guest_view')return json({session:{id:s.id,starts_at:s.starts_at,status:s.status,meet_url:s.meet_url,pre_feedback:s.pre_feedback,feedback:s.feedback,offered_slots:s.offered_slots}});
   if(body.action==='guest_book'){
    if(typeof body.name!=='string'||body.name.trim().length<2||!/^\S+@\S+\.\S+$/.test(body.email||''))throw new Error('Enter your name and email for the calendar invitation.');
    check(await db.rpc('ct_book_validation_guest',{p_session:s.id,p_start:body.startsAt,p_name:body.name.trim().slice(0,100),p_email:body.email.trim().toLowerCase()}));return json({success:true});
   }
   if(body.action==='feedback'){check(await db.rpc('ct_submit_validation_feedback',{p_session:s.id,p_feedback:validateFeedback(body.feedback,!!body.before),p_before:!!body.before}));return json({success:true});}
   throw new Error('Unsupported invitation action.');
  }
  const {data:auth}=await db.auth.getUser(bearer);if(!auth.user)return json({error:'Sign in to manage validation sessions.'},401);const userId=auth.user.id;
  const isAdmin=auth.user.email_confirmed_at&&auth.user.email?.toLowerCase()==='admin@creatives-takeover.com';
  if(body.action==='review_queue'||body.action==='resolve_review'){
   if(!isAdmin)return json({error:'Administrator access required.'},403);
   if(body.action==='review_queue'){const rows=check(await db.from('ct_validation_sessions').select('id,founder_id,reviewer_id,starts_at,status,attendance_status,attendance_evidence,overlap_seconds,reward_status,review_reason,feedback,pre_feedback').or('attendance_status.eq.review,reward_status.eq.review').order('starts_at').limit(100));return json({sessions:rows});}
   if(typeof body.reason!=='string'||body.reason.trim().length<20)throw new Error('Record the attendance evidence or reason for the review decision.');
   const session=check(await db.from('ct_validation_sessions').select('*').eq('id',body.sessionId).single());
   if(session.reward_status==='granted')throw new Error('This grant is already recorded. Handle any correction through the credit ledger.');
   if(body.approve&&(!Number.isInteger(body.overlapSeconds)||body.overlapSeconds<900||body.overlapSeconds>1500))throw new Error('Record 900–1,500 seconds of independently verified overlap.');
   check(await db.from('ct_validation_sessions').update(body.approve?{attendance_status:'verified',overlap_seconds:body.overlapSeconds,status:'completed',reward_status:session.feedback?'held':'pending',review_reason:null,attendance_evidence:{...session.attendance_evidence,reviewedBy:userId,reviewedAt:new Date().toISOString(),evidence:body.reason}}:{reward_status:'ineligible',review_reason:body.reason,status:'review'}).eq('id',session.id));
   check(await db.from('ct_validation_events').insert({session_id:session.id,event:'admin_review',detail:{actor:userId,approved:!!body.approve,reason:body.reason,overlapSeconds:body.overlapSeconds}}));return json({success:true});
  }
  if(body.action==='google_status'){const account=check(await db.from('ct_validation_google_accounts').select('email').eq('user_id',userId).maybeSingle());return json({connected:!!account,email:account?.email,isAdmin:!!isAdmin});}
  if(body.action==='google_disconnect'){check(await db.from('ct_validation_google_accounts').delete().eq('user_id',userId));return json({success:true});}
  if(body.action==='google_connect'){
   if(!coreGoogleConfig(Deno.env.get).clientId)throw new Error('Google Calendar setup is not available yet.');
   const state=crypto.randomUUID();check(await db.from('ct_validation_oauth_states').insert({state,user_id:userId}));const authUrl=new URL('https://accounts.google.com/o/oauth2/v2/auth');authUrl.search=new URLSearchParams({client_id:coreGoogleConfig(Deno.env.get).clientId,redirect_uri:callback(),response_type:'code',access_type:'offline',prompt:'consent',state,scope:'openid email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/meetings.space.readonly'}).toString();return json({url:authUrl.toString()});
  }
  if(body.action==='invite'){
   check(await db.from('ct_product_artifacts').select('artifact_id').eq('user_id',userId).eq('product_id',body.productId).eq('artifact_id',body.contextId).eq('tool','pmf_lab').single());
   check(await db.from('ct_validation_google_accounts').select('user_id').eq('user_id',userId).single());
   const slots=Array.isArray(body.slots)?body.slots:[];if(slots.length<1||slots.length>10||slots.some((s:any)=>typeof s!=='string'||!Number.isFinite(Date.parse(s))||Date.parse(s)<Date.now()+3600000||Date.parse(s)>Date.now()+90*86400000))throw new Error('Offer one to ten future times within 90 days.');
   const token=crypto.randomUUID()+crypto.randomUUID();check(await db.from('ct_validation_sessions').insert({founder_id:userId,product_id:body.productId,context_id:body.contextId,starts_at:slots[0],offered_slots:slots,status:'invited',guest_token_hash:await hash(token),guest_expires_at:new Date(Math.max(...slots.map(Date.parse))+7*86400000).toISOString()}));
   return json({url:`${app()}/validation-sessions?invite=${encodeURIComponent(token)}`});
  }
  const s=check(await db.from('ct_validation_sessions').select('*').eq('id',body.sessionId).or(`founder_id.eq.${userId},reviewer_id.eq.${userId}`).single());
  if(body.action==='feedback'){if(s.reviewer_id!==userId)throw new Error('Only the booked reviewer can submit feedback.');check(await db.rpc('ct_submit_validation_feedback',{p_session:s.id,p_feedback:validateFeedback(body.feedback,!!body.before),p_before:!!body.before}));return json({success:true});}
  if(['cancel','reschedule'].includes(body.action)){check(await db.rpc('ct_change_validation_session',{p_session:s.id,p_actor:userId,p_action:body.action,p_start:body.startsAt||null}));return json({success:true});}
  if(body.action==='dispute'){if(typeof body.reason!=='string'||body.reason.trim().length<10)throw new Error('Describe the issue.');check(await db.from('ct_validation_sessions').update({reward_status:s.reward_status==='granted'?'granted':'review',review_reason:body.reason.slice(0,2000)}).eq('id',s.id));check(await db.from('ct_validation_events').insert({session_id:s.id,event:'dispute',detail:{actor:userId,reason:body.reason.slice(0,2000)}}));return json({success:true});}
  if(body.action==='retry_calendar'){await calendar(s);return json({success:true});}
  return json({error:'Unsupported action.'},400);
 }catch(e){return json({error:e instanceof Error?e.message:'Validation session request failed.'},400);}
});
