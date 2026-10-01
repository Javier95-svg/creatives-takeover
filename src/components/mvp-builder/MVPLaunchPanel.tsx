import {Button} from '@/components/ui/button';
import type {WorkflowTestResult} from '@/hooks/useMvpWorkflowTest';
export function MVPLaunchPanel({hasFiles,generating,testing,publishing,available,fallback,dirty,result,canPublish,requirement,onTest,onPublish}:{
 hasFiles:boolean;generating:boolean;testing:boolean;publishing:boolean;available:boolean|null;fallback:boolean;dirty:boolean;
 result:WorkflowTestResult|null;canPublish:boolean;requirement:string|null;onTest:()=>void;onPublish:()=>void;
}){
 const stage=!hasFiles&&!generating?'Describe':generating||fallback?'Build':canPublish?'Publish':'Check';
 const blocked=generating||publishing||testing||fallback||available!==true||!!requirement;
 const message=generating?'Building your app. Your last saved version is kept.':fallback?'The preview is showing an earlier working version. Repair the current build before publishing.':dirty?'Your app changed. Check this version again.':result?.failure_details||requirement||(canPublish?'This saved version passed its checks. It is ready to publish.':available===false?'Publishing checks are offline. Your draft is saved; try again when the service is available.':'Check the current app before publishing. Testing and reviewing results are free.');
 return <section aria-label="Build progress" className="shrink-0 border-b px-4 py-3 text-sm">
  <ol className="flex flex-wrap gap-4 text-xs" aria-label="App progress">{['Describe','Build','Check','Publish'].map((label,i)=><li key={label} aria-current={stage===label?'step':undefined} className={stage===label?'font-semibold text-primary':'text-muted-foreground'}>{i+1}. {label}</li>)}</ol>
  {hasFiles||generating?<div className="mt-2 flex flex-wrap items-center gap-3"><p role="status" className="min-w-0 flex-1">{message}</p>{canPublish?<Button size="sm" disabled={blocked} onClick={onPublish}>{publishing?'Publishing...':'Publish app'}</Button>:<Button size="sm" disabled={blocked||!hasFiles} onClick={onTest}>{testing?'Checking your app...':'Check my app'}</Button>}</div>:null}
  {result&&<details className="mt-2 text-xs"><summary className="cursor-pointer">Check details</summary><p className="mt-2">{result.status} · Saved version {result.revision.slice(0,10)}</p><ul>{Object.entries(result.assertions).map(([name,passed])=><li key={name}>{passed?'Passed':'Not passed'}: {name.replaceAll('_',' ')}</li>)}</ul></details>}
 </section>;
}
