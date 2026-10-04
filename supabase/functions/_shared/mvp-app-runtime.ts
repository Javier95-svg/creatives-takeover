// Reviewed browser runtime bundled into generated apps. No privileged credentials.
export const APP_RUNTIME_V1 = String.raw`
export function createAppClient({url,publicKey,appId}) {
 if(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url)||!appId)throw Error('App configuration is missing');
 let valid=/^sb_publishable_/.test(publicKey);
 try{valid ||= JSON.parse(atob(publicKey.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).role==='anon';}catch{}
 if(!valid)throw Error('Only public application credentials are allowed');
 const storageKey='ct-app-session:'+url+':'+appId;
 let session;try{session=JSON.parse(localStorage.getItem(storageKey)||'null');}catch{}
 const save=value=>{session=value;if(value)localStorage.setItem(storageKey,JSON.stringify(value));else localStorage.removeItem(storageKey);};
 async function request(path,{method='GET',body,privateRequest=false,prefer,token}={}) {
  if(privateRequest&&!session?.access_token)throw Error('Sign in to complete this action');
  const r=await fetch(url+path,{method,headers:{apikey:publicKey,'Content-Type':'application/json',...(session?.access_token||token?{Authorization:'Bearer '+(token||session.access_token)}:{}),...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json().catch(()=>null);
  if(!r.ok){if(r.status===401)save(null);throw Error(data?.message||data?.msg||data?.error_description||'This action could not be saved. Please retry.');}
  return data;
 }
 const rpc=(name,args,privateRequest=true)=>request('/rest/v1/rpc/'+name,{method:'POST',body:{p_app:appId,...args},privateRequest});
 const list=(table,filters={})=>request('/rest/v1/'+table+'?'+new URLSearchParams({app_id:'eq.'+appId,select:'*',limit:'1000',...filters}),{privateRequest:true});
 const records={
  list:()=>list('ct_app_records',{order:'created_at.desc'}),
  create:({title,body=''})=>request('/rest/v1/ct_app_records',{method:'POST',body:{app_id:appId,title,body},privateRequest:true,prefer:'return=representation'}),
  update:(id,{title,body,status})=>request('/rest/v1/ct_app_records?'+new URLSearchParams({id:'eq.'+id,app_id:'eq.'+appId}),{method:'PATCH',body:{title,body,status},privateRequest:true,prefer:'return=representation'}).then(rows=>{if(!rows?.length)throw Error('Record was not saved. Reload and try again.');return rows[0];}),
  history:()=>list('ct_app_history',{order:'created_at.desc'}),
 };
 return {
  version:'1.0.0',
  auth:{
   session:()=>session,
   async signIn(email,password){const data=await request('/auth/v1/token?grant_type=password',{method:'POST',body:{email,password}});if(!data?.access_token)throw Error('Sign-in did not complete');save(data);return data.user;},
   async signUp(email,password){const data=await request('/auth/v1/signup',{method:'POST',body:{email,password}});if(data?.access_token)save(data);return {user:data?.user,checkEmail:!data?.access_token};},
   async refresh(){if(!session?.refresh_token)throw Error('Sign in again');const data=await request('/auth/v1/token?grant_type=refresh_token',{method:'POST',body:{refresh_token:session.refresh_token}});save(data);return data.user;},
   async signOut(){try{await request('/auth/v1/logout',{method:'POST',privateRequest:true});}finally{save(null);}},
   recover:email=>request('/auth/v1/recover',{method:'POST',body:{email}}),
   async acceptRecovery(){const h=new URLSearchParams(location.hash.slice(1));if(h.get('type')!=='recovery'||!h.get('access_token'))throw Error('Open your password recovery link first');const user=await request('/auth/v1/user',{token:h.get('access_token')});save({access_token:h.get('access_token'),refresh_token:h.get('refresh_token'),user});history.replaceState(null,'',location.pathname+location.search);},
   changePassword:password=>request('/auth/v1/user',{method:'PUT',body:{password},privateRequest:true}),
  }, records,
  leads:{capture:(email,referral)=>rpc('ct_capture_lead',{p_email:email,p_referral:referral||null},false),list:()=>list('ct_app_leads',{order:'created_at.desc'})},
  habits:{checkIn:(recordId,timezone=Intl.DateTimeFormat().resolvedOptions().timeZone)=>rpc('ct_checkin',{p_record:recordId,p_timezone:timezone}),list:()=>list('ct_app_checkins')},
  booking:{slots:()=>request('/rest/v1/ct_app_slots?'+new URLSearchParams({app_id:'eq.'+appId,select:'*',order:'starts_at.asc'})),book:slotId=>rpc('ct_book_slot',{p_slot:slotId}),cancel:id=>rpc('ct_cancel_booking',{p_booking:id}),mine:()=>list('ct_app_bookings'),createSlot:({starts_at,ends_at,timezone,capacity})=>request('/rest/v1/ct_app_slots',{method:'POST',body:{app_id:appId,starts_at,ends_at,timezone,capacity},privateRequest:true,prefer:'return=representation'})},
  dashboard:{list:()=>list('ct_app_metrics',{order:'day.asc'}),importRows:rows=>{if(!Array.isArray(rows)||!rows.length||rows.length>1000)throw Error('Import 1 to 1,000 validated rows at a time');return request('/rest/v1/ct_app_metrics?on_conflict=app_id,user_id,source_key',{method:'POST',body:rows.map(({source_key,day,category,amount})=>({app_id:appId,source_key,day,category,amount})),privateRequest:true,prefer:'resolution=ignore-duplicates,return=representation'});}},
  exportRecords:async()=>({schemaVersion:'1.0.0',exportedAt:new Date().toISOString(),records:await records.list()}),
 };
}
`;
