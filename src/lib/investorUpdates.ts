import { supabase } from '@/integrations/supabase/client';

export type InvestorUpdateAudience = 'stakeholder' | 'fundraising';
export type EvidenceQuality = 'platform-verified' | 'corroborated' | 'founder-reported' | 'missing';
export interface InvestorUpdateSections { summary:string; wins:string[]; productProgress:string[]; traction:string[]; acquisition:string[]; revenueRetention:string[]; challenges:string[]; priorities:string[]; asks:string[]; runway:string; useOfCapital:string }
export interface InvestorUpdateSnapshot { version:number; audience:InvestorUpdateAudience; title:string; period:{start:string;end:string}; sections:InvestorUpdateSections; evidenceNotes:Array<{key:string;label:string;quality:EvidenceQuality;source:string;observedAt:string|null}>; finalizedAt:string; supportingAppendix:{label:string;path:string} }
export interface InvestorUpdateReport { id:string; period_start:string; period_end:string; audience:InvestorUpdateAudience; revision:number; status:'draft'|'finalized'|'archived'; title:string; sections:InvestorUpdateSections; evidence_snapshot:{ company:{name:string;description?:string|null}; stage:number|null; evidence:Array<{key:string;label:string;value:string|number|null;quality:EvidenceQuality;source:string;change?:number|null}>; missing:string[] }; finalized_snapshot:InvestorUpdateSnapshot|null; finalized_at:string|null; shared_at:string|null; updated_at:string }

export async function investorUpdateAction<T>(body:Record<string,unknown>):Promise<T>{
  const {data,error}=await supabase.functions.invoke('generate-investor-update',{body});
  if(error) throw new Error(error.message||'Investor Update operation failed.');
  if(data?.error) throw new Error(data.error);
  return data as T;
}

const lines=(label:string,items:string[])=>items.length?`\n${label}\n${items.map((item)=>`- ${item}`).join('\n')}`:'';
export function snapshotMarkdown(snapshot:InvestorUpdateSnapshot){
  const s=snapshot.sections;
  return `# ${snapshot.title}\n\n${s.summary}${lines('Key wins and milestones',s.wins)}${lines('Product and customer progress',s.productProgress)}${lines('Traction',s.traction)}${lines('Acquisition experiments and decisions',s.acquisition)}${lines('Revenue and retention',s.revenueRetention)}${lines('Challenges and lessons',s.challenges)}${s.runway?`\n\nRunway and readiness\n${s.runway}`:''}${s.useOfCapital?`\n\nIntended use of capital\n${s.useOfCapital}`:''}${lines("Next month's priorities",s.priorities)}${lines('Asks',s.asks)}\n\nEvidence notes\n${snapshot.evidenceNotes.map((note)=>`- ${note.label}: ${note.quality} — ${note.source}`).join('\n')}`;
}
export function snapshotEmail(snapshot:InvestorUpdateSnapshot){return snapshotMarkdown(snapshot).replace(/^# /,'').replace(/^##? /gm,'').replace(/^- /gm,'• ')}

export async function exportInvestorUpdatePdf(snapshot:InvestorUpdateSnapshot){
  const {jsPDF}=await import('jspdf'); const doc=new jsPDF({unit:'pt',format:'a4'}); const margin=48,width=doc.internal.pageSize.getWidth()-96,height=doc.internal.pageSize.getHeight()-48; let y=48;
  const add=(text:string,size=10,bold=false)=>{doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);const wrapped=doc.splitTextToSize(text,width);if(y+wrapped.length*(size+3)>height){doc.addPage();y=48;}doc.text(wrapped,margin,y);y+=wrapped.length*(size+3)+8;};
  add(snapshot.title,18,true); add(`${snapshot.period.start} to ${snapshot.period.end}`,9); const s=snapshot.sections; add(s.summary,11);
  for(const [heading,value] of [['Key wins and milestones',s.wins],['Product and customer progress',s.productProgress],['Traction metrics',s.traction],['Acquisition experiments and decisions',s.acquisition],['Revenue and retention',s.revenueRetention],['Challenges and lessons',s.challenges],["Next month's priorities",s.priorities],['Founder asks',s.asks]] as Array<[string,string[]]>){if(!value.length)continue;add(heading,12,true);value.forEach((item)=>add(`• ${item}`));}
  if(s.runway){add('Runway and fundraising readiness',12,true);add(s.runway);} if(s.useOfCapital){add('Intended use of capital',12,true);add(s.useOfCapital);}
  add('Evidence and verification notes',12,true);snapshot.evidenceNotes.forEach((note)=>add(`• ${note.label}: ${note.quality} — ${note.source}`,8));
  doc.save(`investor-update-${snapshot.period.start}-${snapshot.audience}.pdf`);
}
