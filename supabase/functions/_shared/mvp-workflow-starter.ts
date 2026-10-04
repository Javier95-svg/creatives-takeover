import type { WorkflowDefinition } from './mvp-workflow.ts';
import { publicKeyError, workflowErrors } from './mvp-workflow.ts';
type File = {filename:string;content:string;description?:string};
type Runtime = {url:string;publicKey:string;projectId:string};
const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));

/** Reviewed behavior shared by generated UIs, independent of model-authored handlers. */
export const WORKFLOW_CLIENT = String.raw`
(function(){
 const config=window.CT_WORKFLOW;
 const key='ct-workflow:'+config.url+':'+config.projectId;
 let session=null;try{session=JSON.parse(localStorage.getItem(key)||'null');}catch{}
 const control=id=>document.querySelector('[data-testid="'+id+'"]');
 const value=id=>control(id)?.value?.trim()||'';
 const show=(id,text)=>{const el=control(id);if(el){el.textContent=text;el.hidden=!text;}};
 const store=s=>{session=s;if(s)localStorage.setItem(key,JSON.stringify(s));else localStorage.removeItem(key);};
 async function api(path,method='GET',body,prefer){
  if(session?.expires_at&&session.expires_at*1000<Date.now()&&session.refresh_token){
   const r=await fetch(config.url+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:config.publicKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:session.refresh_token})});
   const next=await r.json();if(!r.ok){store(null);throw Error('Your session expired. Sign in again.');}store(next);
  }
  const r=await fetch(config.url+path,{method,headers:{apikey:config.publicKey,'Content-Type':'application/json',...(session?.access_token?{Authorization:'Bearer '+session.access_token}:{}),...(prefer?{Prefer:prefer}:{})},body:body===undefined?undefined:JSON.stringify(body)});
  const data=await r.json().catch(()=>null);
  if(!r.ok){dispatchEvent(new CustomEvent('ct-workflow-error',{detail:{kind:path.startsWith('/auth')?'auth':method==='POST'||method==='PATCH'?'write':'network'}}));if(r.status===401)store(null);throw Error(data?.message||data?.msg||data?.error_description||'This action failed. Your changes were not saved.');}
  return data;
 }
 async function records(){
  const list=control('ct-records');if(!list)return;
  list.replaceChildren();if(!session?.access_token)return;
  const owners=await api('/rest/v1/ct_mvp_workflow_owners?project_key=eq.'+config.projectId+'&select=user_id');
  const owner=owners?.some(o=>o.user_id===session.user?.id);
  const rows=await api('/rest/v1/ct_mvp_records?project_key=eq.'+config.projectId+'&select=*&order=created_at.desc');
  for(const row of rows){
   const item=document.createElement('article');item.dataset.testid='ct-record';
   const text=document.createElement('p');text.textContent=[row.email,row.body].filter(Boolean).join(', ');item.append(text);
   if(config.starter==='request_management'){
    const status=document.createElement('select');status.dataset.testid='ct-status';status.setAttribute('aria-label','Request status');
    for(const v of ['new','done']){const o=document.createElement('option');o.value=v;o.textContent=v;status.append(o);}status.value=row.status;status.disabled=!owner;item.append(status);
    if(owner){const save=document.createElement('button');save.type='button';save.dataset.testid='ct-save-status';save.textContent='Save status';save.onclick=async()=>{save.disabled=true;try{const result=await api('/rest/v1/ct_mvp_records?project_key=eq.'+config.projectId+'&id=eq.'+row.id,'PATCH',{status:status.value},'return=representation');if(!result?.length)throw Error('The status was not saved.');show('ct-success','Status saved');await records();}catch(e){show('ct-error',e.message);}finally{save.disabled=false;}};item.append(save);}
   }
   if(config.starter==='customer_portal'){
    const edit=document.createElement('button');edit.type='button';edit.dataset.testid='ct-edit-record';edit.textContent='Edit';edit.onclick=()=>{const body=control('ct-body');body.value=row.body;body.dataset.recordId=row.id;};item.append(edit);
   }
   list.append(item);
  }
  if(!rows.length){const p=document.createElement('p');p.textContent='No saved records yet.';list.append(p);}
 }
 const actions=new Map();
 function action(id,task){actions.set(id,task);}
 document.addEventListener('click',async e=>{const button=e.target.closest('[data-testid]');const task=actions.get(button?.dataset.testid);if(!task||button.disabled)return;e.preventDefault();e.stopImmediatePropagation();button.disabled=true;show('ct-error','');show('ct-success','');try{await task();}catch(error){show('ct-error',error.message||'Please retry.');}finally{button.disabled=false;sync();}},true);
 function sync(){const panel=control('ct-compose');if(panel)panel.hidden=config.starter!=='lead_capture'&&!session?.access_token;const logout=control('ct-logout');if(logout)logout.hidden=!session?.access_token;}
 function start(){
  action('ct-login-submit',async()=>{const data=await api('/auth/v1/token?grant_type=password','POST',{email:value('ct-login-email'),password:value('ct-login-password')});if(!data?.access_token)throw Error('Sign-in did not complete');store(data);await records();});
  action('ct-logout',async()=>{try{await api('/auth/v1/logout','POST');}finally{store(null);await records();}});
  action('ct-submit',async()=>{
   if(config.starter!=='lead_capture'&&!session?.user?.id)throw Error('Sign in first.');
   const email=config.starter==='lead_capture'?value('ct-email'):session.user.email,body=value('ct-body');
   if(config.starter==='lead_capture'&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw Error('Enter a valid email address.');
   if(config.starter!=='lead_capture'&&!body)throw Error('Describe your request or record.');
   const recordId=control('ct-body')?.dataset.recordId;
   if(recordId&&config.starter==='customer_portal'){
    const saved=await api('/rest/v1/ct_mvp_records?project_key=eq.'+config.projectId+'&id=eq.'+recordId,'PATCH',{body},'return=representation');if(!saved?.length)throw Error('The record was not saved.');delete control('ct-body').dataset.recordId;
   }else await api('/rest/v1/ct_mvp_records','POST',{project_key:config.projectId,user_id:config.starter==='lead_capture'?null:session.user.id,email,body,status:'new'},'return=minimal');
   show('ct-success','Saved successfully');await records();
  });
  action('ct-signup-submit',async()=>{const result=await api('/auth/v1/signup','POST',{email:value('ct-signup-email'),password:value('ct-signup-password')});if(result?.access_token){store(result);await records();}show('ct-success',result?.access_token?'Account created':'Check your email to confirm your account, then sign in.');});
  action('ct-recover-submit',async()=>{await api('/auth/v1/recover?redirect_to='+encodeURIComponent(location.origin),'POST',{email:value('ct-recover-email')});show('ct-success','If this account exists, check your email for its recovery link.');});
  action('ct-recover-save',async()=>{const password=value('ct-new-password');if(password.length<8)throw Error('Use at least eight characters.');await api('/auth/v1/user','PUT',{password});const user=await api('/auth/v1/user');store({...session,user});await records();show('ct-success','Password updated. You can now sign in.');});
  const fragment=new URLSearchParams(location.hash.slice(1));if(fragment.get('type')==='recovery'&&fragment.get('access_token')){
   store({access_token:fragment.get('access_token'),refresh_token:fragment.get('refresh_token')});history.replaceState(null,'',location.pathname+location.search);const recovery=control('ct-recovery');if(recovery)recovery.hidden=false;
  }
  const mount=()=>{if(!control('ct-records'))return false;sync();records().catch(e=>show('ct-error',e.message));return true;};
  if(!mount()){const observer=new MutationObserver(()=>{if(mount())observer.disconnect();});observer.observe(document.body,{childList:true,subtree:true});setTimeout(()=>observer.disconnect(),10000);}
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
`;

export function workflowStarter(workflow:WorkflowDefinition,runtime:Runtime):File[] {
 if(workflowErrors(workflow).length||publicKeyError(runtime.publicKey)||!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(runtime.url)||! /^[0-9a-f-]{36}$/i.test(runtime.projectId))throw Error('Invalid connected workflow configuration');
 const title=escapeHtml(workflow.starter==='lead_capture'?'Join the list':workflow.starter==='request_management'?'Your requests':'Your customer portal');
 const html=`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font:16px system-ui;background:#10131b;color:#f3f4f6;margin:0}main{max-width:760px;margin:40px auto;padding:20px}section,article{padding:20px;border:1px solid #374151;border-radius:12px;margin:16px 0}input,textarea,button,select{font:inherit;box-sizing:border-box;max-width:100%;padding:10px;border-radius:8px;margin:6px 0}input,textarea{display:block;width:100%}button{cursor:pointer}button:disabled{opacity:.5}article{overflow-wrap:anywhere}[hidden]{display:none!important}</style></head><body><main><h1>${title}</h1><p>${escapeHtml(workflow.task)}</p><p role="alert" data-testid="ct-error" hidden></p><p role="status" data-testid="ct-success" hidden></p><section><h2>Sign in</h2><label>Email<input type="email" autocomplete="username" data-testid="ct-login-email"></label><label>Password<input type="password" autocomplete="current-password" data-testid="ct-login-password"></label><button type="button" data-testid="ct-login-submit">Sign in</button><button type="button" data-testid="ct-logout" hidden>Sign out</button><details><summary>Create an account</summary><label>Email<input type="email" data-testid="ct-signup-email"></label><label>Password<input type="password" data-testid="ct-signup-password"></label><button type="button" data-testid="ct-signup-submit">Create account</button></details><details><summary>Forgot password / owner access</summary><label>Email<input type="email" data-testid="ct-recover-email"></label><button type="button" data-testid="ct-recover-submit">Send recovery link</button></details><div data-testid="ct-recovery" hidden><label>New password<input type="password" data-testid="ct-new-password"></label><button type="button" data-testid="ct-recover-save">Save new password</button></div></section><section data-testid="ct-compose"><h2>${workflow.starter==='lead_capture'?'Leave your details':'Save a record'}</h2><label>Email<input type="email" data-testid="ct-email"></label><label>Details<textarea data-testid="ct-body"></textarea></label><button type="button" data-testid="ct-submit">Save</button></section><section><h2>Saved records</h2><div data-testid="ct-records"></div></section></main><script src="/ct-workflow.js"></script></body></html>`;
 return [{filename:'index.html',content:html},{filename:'ct-workflow.js',content:'window.CT_WORKFLOW='+JSON.stringify({...runtime,starter:workflow.starter}).replace(/</g,'\\u003c')+';\n'+WORKFLOW_CLIENT}];
}

export function bindWorkflowStarter<T extends {files:File[]}>(output:T,workflow:WorkflowDefinition,runtime:Runtime):T {
 const starter=workflowStarter(workflow,runtime),script=starter[1];
 const files=output.files.filter(f=>f.filename!=='ct-workflow.js').map(f=>{
  if(f.filename!=='index.html')return f;
  const content=f.content.replace(/<script\b[^>]*src=["'][^"']*ct-workflow\.js["'][^>]*>\s*<\/script>/gi,'');
  return {...f,content:content.replace(/<\/body>/i,'<script src="/ct-workflow.js"></script></body>')};
 });
 return {...output,files:[...files,script]};
}
