export function checkedPreviewDocument(files:{filename:string;content:string}[]):string {
 const byName=new Map(files.map(f=>[f.filename,f.content]));
 const html=byName.get('index.html');if(!html)throw Error('The checked build has no entry page.');
 const doc=new DOMParser().parseFromString(html,'text/html');
 const data=(type:string,content:string)=>'data:'+type+';base64,'+btoa(Array.from(new TextEncoder().encode(content),b=>String.fromCharCode(b)).join(''));
 const local=(path:string)=>byName.get(path.replace(/^\.?\//,''));
 doc.querySelectorAll('base,meta[http-equiv="refresh"]').forEach(n=>n.remove());
 const policy=doc.createElement('meta');policy.httpEquiv='Content-Security-Policy';
 policy.content="default-src 'none'; script-src data:; style-src 'unsafe-inline' data:; img-src data:; font-src data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'";
 doc.head.prepend(policy);
 for(const script of doc.querySelectorAll('script')){
  if(script.type==='application/ld+json')continue;
  const source=script.getAttribute('src'),content=source?local(source):script.textContent||'';
  if(content===undefined){script.remove();continue;}
  script.removeAttribute('integrity');script.removeAttribute('crossorigin');script.textContent='';script.src=data('application/javascript',content);
 }
 for(const link of doc.querySelectorAll('link')){
  const content=local(link.getAttribute('href')||'');
  if(link.rel==='stylesheet'&&content!==undefined){link.href=data('text/css',content);link.removeAttribute('integrity');}else link.remove();
 }
 for(const image of doc.querySelectorAll('img')){
  const source=image.getAttribute('src')||'',content=local(source);
  if(content!==undefined&&source.endsWith('.svg'))image.src=data('image/svg+xml',content);
 }
 // Isolated review cannot submit forms, navigate to a merchant or call live APIs.
 const guard=doc.createElement('script');guard.src=data('application/javascript',"document.addEventListener('submit',e=>e.preventDefault(),true);document.addEventListener('click',e=>{const a=e.target.closest?.('a');if(a&&!a.getAttribute('href')?.startsWith('#'))e.preventDefault();},true);");
 doc.head.insertBefore(guard,policy.nextSibling);
 return '<!doctype html>'+doc.documentElement.outerHTML;
}
