export type IdentitySession = { subject: string | null; startTime: string; endTime: string | null };
/** Union intervals before intersecting: reconnects or simultaneous devices cannot inflate attendance. */
export function identityOverlap(sessions: IdentitySession[], founder: string | null, reviewer: string | null, startsAt: string) {
  if (!founder || !reviewer || founder === reviewer) return { status: 'review', overlapSeconds: 0 };
  const start=Date.parse(startsAt), end=start+25*60000;
  const intervals=(subject:string)=>{
    const values=sessions.filter(s=>s.subject===subject&&s.endTime).map(s=>[Math.max(start,Date.parse(s.startTime)),Math.min(end,Date.parse(s.endTime!))])
      .filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)&&b>a).sort((a,b)=>a[0]-b[0]);
    const merged:number[][]=[];for(const value of values){const last=merged.at(-1);if(last&&value[0]<=last[1])last[1]=Math.max(last[1],value[1]);else merged.push(value);}return merged;
  };
  let total=0;for(const [a,b] of intervals(founder))for(const [c,d] of intervals(reviewer))total+=Math.max(0,Math.min(b,d)-Math.max(a,c));
  const overlapSeconds=Math.floor(total/1000);
  return {status:overlapSeconds>=900?'verified':'review',overlapSeconds};
}
export const preFeedbackFields=['recentBehavior','currentWorkaround','problemRelevance'] as const;
export const feedbackFields=['clarity','objections','willingnessToTry','willingnessToPay','suggestedChange'] as const;
export function validateFeedback(input: unknown, before: boolean) {
  if(!input||typeof input!=='object')throw new Error('Complete the feedback form.');
  const output:Record<string,string>={};for(const field of before?preFeedbackFields:feedbackFields){const value=(input as any)[field];if(typeof value!=='string'||value.trim().length<5||value.length>3000)throw new Error(`Complete ${field} with 5–3,000 characters.`);output[field]=value.trim();}return output;
}
