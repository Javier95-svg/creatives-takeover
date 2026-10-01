import {useEffect,useState} from 'react';
import {getDemoMetrics} from '@/lib/demoStudio/api';
import type {DemoMetrics} from '@/lib/demoStudio/types';
export default function DemoResultsSummary({demoId}:{demoId:string}){
 const [metrics,setMetrics]=useState<DemoMetrics|null>(null);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{let active=true;void getDemoMetrics(demoId,'7d').then(data=>{if(active)setMetrics(data);}).catch(()=>{if(active)setFailed(true);});return()=>{active=false;};},[demoId]);
 return <section className="rounded-lg border p-3 text-xs" aria-label="Demo results">
  <h3 className="font-semibold">Viewer results · last 7 days</h3>
  {metrics?<><p className="my-2">{metrics.uniqueViewers} viewers · {metrics.completions} completions ({metrics.completionRate}%) · {metrics.ctaClicks} CTA clicks</p><p>{!metrics.views?'Next: share the link with a few target customers.':metrics.completionRate<50?'Next: simplify the first screen where viewers leave.':!metrics.ctaClicks?'Next: clarify the final action and what happens after clicking.':'Next: ask target customers what they expected after clicking.'}</p></>:<p>{failed?'Results are unavailable. Open Analytics to retry.':'Loading viewer results…'}</p>}
  <p className="mt-2 text-muted-foreground">These signals describe demo engagement. They do not establish customer demand or willingness to pay.</p>
 </section>;
}
