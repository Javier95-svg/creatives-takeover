// Injected into every published MVP Builder app, next to the visit beacon.
// Forms marked data-ct-lead save their fields to the founder's Leads tab
// (mvp-app-lead edge function) instead of going nowhere. Generated apps are
// told to mark their signup, request and contact forms this way; apps that
// handle forms in JavaScript can call window.ctLead({ ... }) instead.
//
// Optional attributes on the form:
//   data-ct-success="Thanks! We will email you."  message shown after saving

export function buildLeadScript(leadUrl: string): string {
  const source = `(function(){
var url=${JSON.stringify(leadUrl)};
function send(fields){
  var vid=null;try{vid=localStorage.getItem("ct_vid");}catch(e){}
  return fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({slug:location.hostname.split(".")[0],fields:fields,path:location.pathname,visitorId:vid})})
    .then(function(r){return r.json().catch(function(){return {ok:false};});})
    .then(function(d){if(!d||!d.ok){throw new Error((d&&d.error)||"Could not save. Please try again.");}return d;});
}
window.ctLead=send;
document.addEventListener("submit",function(ev){
  var form=ev.target;
  if(!form||!form.matches||!form.matches("form[data-ct-lead]"))return;
  ev.preventDefault();
  var data={};
  new FormData(form).forEach(function(value,key){if(typeof value==="string"){data[key]=value;}});
  var button=form.querySelector("[type=submit]");
  if(button){button.disabled=true;}
  var error=form.querySelector("[data-ct-error]");
  if(error){error.textContent="";}
  send(data).then(function(){
    var note=document.createElement("p");
    note.setAttribute("role","status");
    note.textContent=form.getAttribute("data-ct-success")||"Thanks! We will be in touch.";
    form.replaceWith(note);
    try{if(window.posthog&&window.posthog.capture){window.posthog.capture("form_submitted",{source:"ct_lead",path:location.pathname});}}catch(e){}
  }).catch(function(err){
    if(button){button.disabled=false;}
    if(!error){error=document.createElement("p");error.setAttribute("data-ct-error","");error.setAttribute("role","alert");form.appendChild(error);}
    error.textContent=(err&&err.message)||"Could not save. Please try again.";
  });
},true);
})();`;
  return `<script>${source.replace(/\n\s*/g, '')}</script>`;
}
