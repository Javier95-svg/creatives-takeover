export interface Observation { id:string; metric:string; value:number|null; denominator?:number|null; currency?:string|null; definition:Record<string,any>; period_start:string; period_end:string; captured_at:string; provenance:string; status:string }
// Stripe charge amounts use two decimals except the documented zero-decimal
// currencies. ISK and UGX intentionally retain two-decimal API representation.
const stripeZeroDecimals=new Set(['bif','clp','djf','gnf','jpy','kmf','krw','mga','pyg','rwf','vnd','vuv','xaf','xof','xpf']);
export function displayMoney(value:number,currency:string,unit:string){
 const amount=unit==='minor_currency'?value/(stripeZeroDecimals.has(currency.toLowerCase())?1:100):value;
 try{return new Intl.NumberFormat(undefined,{style:'currency',currency:currency.toUpperCase()}).format(amount);}catch{return `${value} ${currency} (${unit})`;}
}
export function summarizeConnectedResults(rows:Observation[],from:string,to:string,campaign?:string){
 const within=rows.filter(r=>r.status==='complete'&&Date.parse(r.period_start)>=Date.parse(from)&&Date.parse(r.period_end)<=Date.parse(to)&&(!campaign||r.definition.campaign===campaign));
 const sum=(metric:string)=>{const found=within.filter(r=>r.metric===metric);return found.length?found.reduce((n,r)=>n+Number(r.value||0),0):null;};
 const revenue=new Map<string,number>();const customers=new Set<string>();let unattributed=0;
 for(const r of within.filter(r=>['net_payments','net_order_value'].includes(r.metric))){const key=`${r.currency||'unknown'}:${r.definition.unit}`;revenue.set(key,(revenue.get(key)||0)+Number(r.value||0));if(Number(r.value)>0&&r.definition.customer)customers.add(`${r.definition.source}:${r.definition.customer}`);if(!r.definition.campaign)unattributed++;}
 return {visits:sum('campaign_visits'),keyEvents:sum('campaign_key_events'),revenue:[...revenue.entries()].map(([key,value])=>({currency:key.split(':')[0],unit:key.split(':')[1],value})),paidCustomers:customers.size||null,unattributed,observations:within};
}
export function acquisitionCost(spend:number|null,newCustomers:number|null,costComplete:boolean,attributionComplete:boolean){return costComplete&&attributionComplete&&spend!=null&&spend>=0&&newCustomers!=null&&Number.isInteger(newCustomers)&&newCustomers>0?spend/newCustomers:null;}

export function connectedFunnel(evidence:any[],campaign:string,from:string,to:string){
 const campaignOf=(row:any)=>{if(row?.original?.metadata?.utm_campaign)return row.original.metadata.utm_campaign;try{return new URL(row?.original?.hs_analytics_first_url).searchParams.get('utm_campaign')||null;}catch{return null;}};
 const contacts=evidence.filter(e=>e.kind==='contact');const identities=new Map<string,any[]>();
 for(const contact of contacts)if(contact.participant_key)identities.set(contact.participant_key,[...(identities.get(contact.participant_key)||[]),contact]);
 const inPeriod=(e:any)=>Date.parse(e.captured_at)>=Date.parse(from)&&Date.parse(e.captured_at)<=Date.parse(to);
 const leads=contacts.filter(e=>inPeriod(e)&&(!campaign||campaignOf(e)===campaign));
 const qualified=leads.filter(e=>['marketingqualifiedlead','salesqualifiedlead','opportunity','customer'].includes(e.original.lifecyclestage));
 const customers=new Set<string>();let unmatchedPayments=0,matchedPayments=0;
 for(const payment of evidence.filter(e=>e.kind==='payment'&&e.summary?.source==='stripe'&&inPeriod(e)&&e.original.paid===true&&e.original.status==='succeeded'&&Number(e.original.amount)>Number(e.original.amount_refunded||0))){
   const candidates=payment.participant_key?identities.get(payment.participant_key)||[]:[];const contact=candidates.length===1?candidates[0]:null;
   const attributedCampaign=campaignOf(payment)||campaignOf(contact);
   if(!contact){unmatchedPayments++;continue;}if(campaign&&attributedCampaign!==campaign)continue;
   if(payment.original.customer){customers.add(String(payment.original.customer));matchedPayments++;}else unmatchedPayments++;
 }
 return {leads:leads.length,qualified:qualified.length,matchedPaidCustomers:customers.size,matchedPayments,unmatchedPayments};
}
