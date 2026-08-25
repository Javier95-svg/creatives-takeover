import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileCheck2, Loader2, ShieldCheck, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useOutcomeJourney, type JourneyEvidenceType } from '@/hooks/useOutcomeJourney';

// Generated types follow the additive journey migration.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const client = supabase as any;

const EVENT_TYPES: Record<string, JourneyEvidenceType> = {
  reply_received: 'buyer_response',
  interview_completed: 'completed_conversation',
  commitment_received: 'commitment',
  payment_received: 'payment',
};

interface EvidenceEvent { id: string; event_type: keyof typeof EVENT_TYPES; occurred_at: string }

export default function JourneyEvidenceSubmissionCard({ sprintId, stageRunId, experimentId }: {
  sprintId: string; stageRunId?: string | null; experimentId?: string | null;
}) {
  const journey = useOutcomeJourney();
  const [eventId, setEventId] = useState('');
  const [summary, setSummary] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [attested, setAttested] = useState(false);
  const events = useQuery({
    queryKey: ['journey-reviewable-evidence-events', sprintId],
    queryFn: async (): Promise<EvidenceEvent[]> => {
      const { data, error } = await client.from('customer_evidence_events')
        .select('id,event_type,occurred_at').eq('metadata->>sprintId', sprintId)
        .in('event_type', Object.keys(EVENT_TYPES)).order('occurred_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as EvidenceEvent[];
    },
  });
  const selectedEvent = useMemo(() => events.data?.find((event) => event.id === eventId) ?? null, [eventId, events.data]);
  const existing = journey.evidenceSubmissions.filter((submission) => submission.sprint_id === sprintId);

  if (!stageRunId || !experimentId) return <Card><CardHeader><CardTitle>Evidence review</CardTitle><CardDescription>The outcome-journey migration must be deployed before private proof can be submitted.</CardDescription></CardHeader></Card>;

  const submit = async () => {
    if (!selectedEvent || !file) { toast.error('Choose a buyer event and its redacted proof file.'); return; }
    try {
      await journey.submitEvidence({ file, stageRunId, sprintId, experimentId,
        customerEvidenceEventId: selectedEvent.id, evidenceType: EVENT_TYPES[selectedEvent.event_type],
        safeSummary: summary, redactionAttested: attested });
      setEventId(''); setSummary(''); setFile(null); setAttested(false);
      toast.success('Evidence submitted for private review.');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Evidence could not be submitted.'); }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader><div className="flex items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Private buyer evidence</CardTitle><CardDescription className="mt-1">Submit redacted proof for one recorded buyer event. Approval creates a separate reviewer-verified observation; the original report is never rewritten.</CardDescription></div><Badge variant="outline">90-day approved-file retention</Badge></div></CardHeader>
      <CardContent className="space-y-4">
        {events.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : events.data?.length ? <label className="block space-y-1 text-sm"><span>Buyer event</span><select className="h-10 w-full rounded-md border border-input bg-background px-3" value={eventId} onChange={(event) => setEventId(event.target.value)}><option value="">Select a recorded event</option>{events.data.map((event) => <option key={event.id} value={event.id}>{EVENT_TYPES[event.event_type].replaceAll('_', ' ')} · {new Date(event.occurred_at).toLocaleDateString()}</option>)}</select></label> : <p className="text-sm text-muted-foreground">Record a reply, completed conversation, commitment, or payment in the evidence workspace first.</p>}
        <label className="block space-y-1 text-sm"><span>Redacted summary</span><Textarea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Prospect confirmed the problem is active and agreed to a follow-up. No names, emails, transcript, or CRM export." /></label>
        <label className="block space-y-1 text-sm"><span>Redacted file</span><Input type="file" accept="image/png,image/jpeg,image/webp,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
        <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} /><span>I removed contact names, email addresses, full transcripts, and CRM-export details.</span></label>
        <Button disabled={!selectedEvent || !file || summary.trim().length < 8 || !attested || journey.isSaving} onClick={() => void submit()}>{journey.isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}Submit for review</Button>
        {existing.length ? <div className="space-y-2 border-t pt-4"><p className="text-sm font-semibold">Review history</p>{existing.map((submission) => <div key={submission.id} className="flex items-start justify-between gap-3 rounded-lg border p-3 text-sm"><div><p className="font-medium">{submission.evidence_type.replaceAll('_', ' ')}</p><p className="mt-1 text-xs text-muted-foreground">{submission.safe_summary}</p>{submission.rejection_reason ? <p className="mt-1 text-xs text-destructive">{submission.rejection_reason}</p> : null}</div><Badge variant="outline"><FileCheck2 className="mr-1 h-3 w-3" />{submission.status}</Badge></div>)}</div> : null}
      </CardContent>
    </Card>
  );
}
