import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export interface ValidationBriefValue { assumption: string; audience: string; decision: string }
export default function ValidationBrief({ storageKey, onSaved }: { storageKey: string; onSaved: (value: ValidationBriefValue | null) => void }) {
  const [draft,setDraft] = useState<ValidationBriefValue>({assumption:'',audience:'',decision:''});
  const [saved,setSaved] = useState(false), [message,setMessage] = useState('');
  useEffect(() => {
    let value: ValidationBriefValue | null = null;
    try {const parsed=JSON.parse(localStorage.getItem(storageKey)||'null');if(parsed && ['assumption','audience','decision'].every(key=>typeof parsed[key]==='string'))value=parsed;} catch { /* An unavailable browser store leaves a usable empty brief. */ }
    setDraft(value??{assumption:'',audience:'',decision:''});setSaved(Boolean(value));setMessage('');onSaved(value);
  },[storageKey,onSaved]);
  return <details className="rounded-xl border p-4" open={!saved}><summary className="cursor-pointer py-2 font-medium">{saved ? 'Your validation brief — review or edit' : 'Start here: define the decision you need to make'}</summary>
    <form className="mt-3 space-y-3" onSubmit={event => {event.preventDefault();try {localStorage.setItem(storageKey,JSON.stringify(draft));onSaved(draft);setSaved(true);setMessage('Brief saved for this validation context.');} catch {setMessage('Browser storage is unavailable. Keep this page open to retain your draft.');}}}>
      {([['assumption','What are you testing?','Consultants need a faster way to prepare proposals.'],['audience','Who is it for?','Independent consultants who send proposals every week.'],['decision','What decision will this evidence help you make?','Whether to test a paid prototype.']] as const).map(([field,label,placeholder])=><label className="block space-y-1 text-sm" key={field}><span>{label}</span><Input required maxLength={500} value={draft[field]} placeholder={placeholder} onChange={event=>setDraft({...draft,[field]:event.target.value})}/></label>)}
      <p className="text-xs text-muted-foreground">A planning note saved on this device. Your brief does not count as customer evidence or change a saved assessment.</p>
      <Button type="submit" disabled={Object.values(draft).some(value=>!value.trim())}>Save validation brief</Button>
    </form>{message&&<p className="mt-2 text-sm" role="status">{message}</p>}
  </details>;
}
