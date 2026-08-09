import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CalendarClock, CheckCircle2, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  loadMentorDiscoveryPortal,
  respondAsMentor,
  type MentorDiscoveryPortal,
} from '@/services/discoveryCallService';

function readFragmentToken() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const token = params.get('token') ?? '';
  if (token) window.history.replaceState(null, '', window.location.pathname);
  return token;
}

const localValueToIso = (value: string) => value ? new Date(value).toISOString() : '';

export default function MentorDiscoveryResponsePage() {
  const [token] = useState(readFragmentToken);
  const [portal, setPortal] = useState<MentorDiscoveryPortal | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [counterTime, setCounterTime] = useState('');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [meetingInstructions, setMeetingInstructions] = useState('');
  const [reason, setReason] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState(['', '', '']);

  useEffect(() => {
    if (!token) { setError('This secure response link is missing or invalid.'); setLoading(false); return; }
    void loadMentorDiscoveryPortal(token)
      .then((response) => {
        if (!response.success || !response.portal) throw new Error(response.message || 'This link has expired or was already used.');
        setPortal(response.portal);
        setMeetingUrl(response.portal.meetingUrl ?? '');
        setMeetingInstructions(response.portal.meetingInstructions ?? '');
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : 'Unable to load this Discovery Call.'))
      .finally(() => setLoading(false));
  }, [token]);

  const slots = portal?.activeRound?.discovery_call_scheduling_slots ?? [];
  const meetingValid = useMemo(() => /^https:\/\//i.test(meetingUrl.trim()) || meetingInstructions.trim().length >= 10, [meetingInstructions, meetingUrl]);
  const formatTime = (value: string, timeZone?: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short', ...(timeZone ? { timeZone } : {}) }).format(new Date(value));
  const slotTime = (value: string) => <><span>{formatTime(value, portal?.mentorTimezone)} ({portal?.mentorTimezone})</span><span className="block text-xs text-muted-foreground">Founder: {formatTime(value, portal?.founderTimezone)} ({portal?.founderTimezone})</span></>;

  const act = async (input: Parameters<typeof respondAsMentor>[1], successMessage: string) => {
    setSubmitting(true); setError('');
    try {
      const response = await respondAsMentor(token, input);
      if (!response.success) throw new Error(response.error || 'The Discovery Call could not be updated.');
      setDone(successMessage);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'The Discovery Call could not be updated.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading secure response…</main>;
  if (done) return <main className="flex min-h-screen items-center justify-center p-4"><Card className="max-w-lg"><CardContent className="p-10 text-center"><CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-primary" /><h1 className="text-2xl font-bold">Response recorded</h1><p className="mt-3 text-muted-foreground">{done}</p></CardContent></Card></main>;

  return <>
    <Helmet><title>Discovery Call response | Creatives Takeover</title><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /><meta httpEquiv="Cache-Control" content="no-store" /></Helmet>
    <main className="mx-auto min-h-screen max-w-3xl px-4 py-12">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Discovery Call with {portal?.founderName ?? 'a founder'}</CardTitle><CardDescription>This secure page does not require a Creatives Takeover account.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
          {error && <Alert variant="destructive"><AlertDescription>{error} Contact admin@creatives-takeover.com if you need help.</AlertDescription></Alert>}
          {portal && <>
            {portal.topic && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Topic</p><p>{portal.topic}</p></div>}
            {portal.desiredOutcome && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Desired outcome</p><p>{portal.desiredOutcome}</p></div>}
            {portal.notes && <div><p className="text-xs font-semibold uppercase text-muted-foreground">Notes</p><p className="whitespace-pre-line">{portal.notes}</p></div>}

            {portal.purpose === 'mentor_request_response' && <>
              <div className="space-y-2"><Label>Choose a founder-proposed time</Label>{slots.map((slot) => { const unavailable = Date.parse(slot.starts_at) < Date.now() + 24 * 60 * 60 * 1000; return <label key={slot.id} className={`flex items-center gap-3 rounded-lg border p-3 ${unavailable ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}><input type="radio" name="slot" disabled={unavailable} checked={selectedSlot === slot.id} onChange={() => setSelectedSlot(slot.id)} /><span>{slotTime(slot.starts_at)}{unavailable && <span className="block text-xs font-semibold text-destructive">Unavailable — counter-propose a new time.</span>}</span></label>; })}</div>
              <div className="grid gap-4 sm:grid-cols-2"><div><Label htmlFor="meeting-url">HTTPS meeting link</Label><Input id="meeting-url" type="url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/…" /></div><div><Label htmlFor="meeting-instructions">Or meeting instructions</Label><Textarea id="meeting-instructions" value={meetingInstructions} onChange={(e) => setMeetingInstructions(e.target.value)} maxLength={1000} placeholder="Phone or in-person instructions" /></div></div>
              <Button className="w-full" disabled={submitting || !selectedSlot || !meetingValid} onClick={() => void act({ action: 'acceptSlot', slotId: selectedSlot, meetingUrl, meetingInstructions }, 'The call is confirmed. Everyone has been notified.')}>Accept selected time</Button>
              <div className="rounded-lg border p-4"><Label htmlFor="counter">Or propose one different time</Label><Input id="counter" type="datetime-local" value={counterTime} onChange={(e) => setCounterTime(e.target.value)} /><Button variant="outline" className="mt-3" disabled={submitting || !counterTime || !meetingValid} onClick={() => void act({ action: 'counter', counterStartsAt: localValueToIso(counterTime), meetingUrl, meetingInstructions }, 'Your proposed time was sent to the founder. Their 48-hour response window has started.')}>Send counter-proposal</Button></div>
              <div className="border-t pt-5"><Label htmlFor="reason">Decline reason (optional)</Label><Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /><Button variant="destructive" className="mt-3" disabled={submitting} onClick={() => window.confirm('Decline this request and release the founder’s held credits?') && void act({ action: 'decline', reason }, 'The request was declined and the founder’s held credits were released.')}>Decline request</Button></div>
            </>}

            {portal.purpose === 'mentor_booking_manage' && <>
              <Alert><AlertDescription>Confirmed for {portal.scheduledFor ? formatTime(portal.scheduledFor, portal.mentorTimezone) : 'the scheduled time'}. The founder is charged only once.</AlertDescription></Alert>
              {portal.activeRound?.round_type === 'reschedule' && portal.activeRound.responder_role === 'mentor' ? (
                <div className="rounded-lg border p-4">
                  <h2 className="font-semibold">Founder reschedule request</h2>
                  <p className="mb-3 text-sm text-muted-foreground">The original booking remains active unless you accept a replacement.</p>
                  <div className="space-y-2">{slots.map((slot) => <label key={slot.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3"><input type="radio" name="reschedule-slot" checked={selectedSlot === slot.id} onChange={() => setSelectedSlot(slot.id)} /><span>{slotTime(slot.starts_at)}</span></label>)}</div>
                  <Button className="mt-3" disabled={submitting || !selectedSlot || !meetingValid} onClick={() => void act({ action: 'acceptReschedule', slotId: selectedSlot, meetingUrl, meetingInstructions }, 'The replacement time is confirmed. Everyone has been notified.')}>Accept replacement</Button>
                  <div className="mt-4 border-t pt-4">
                    <Label htmlFor="reschedule-counter">Counter with one time</Label>
                    <Input id="reschedule-counter" type="datetime-local" value={counterTime} onChange={(e) => setCounterTime(e.target.value)} />
                    <Button className="mt-2" variant="outline" disabled={submitting || !counterTime || portal.activeRound.counter_depth >= 1} onClick={() => void act({ action: 'counterReschedule', counterStartsAt: localValueToIso(counterTime), meetingUrl, meetingInstructions }, 'Your counter-proposal was sent. The original booking remains active.')}>Send counter</Button>
                    <Button className="ml-2 mt-2" variant="ghost" disabled={submitting} onClick={() => window.confirm('Decline this reschedule and keep the original booking?') && void act({ action: 'declineReschedule' }, 'The reschedule was declined. The original booking remains active.')}>Decline reschedule</Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border p-4"><h2 className="font-semibold">Request a reschedule</h2><p className="mb-3 text-sm text-muted-foreground">Provide three alternatives at least 72 hours away.</p>{rescheduleSlots.map((value, index) => <Input key={index} type="datetime-local" className="mb-2" value={value} onChange={(e) => setRescheduleSlots((current) => current.map((item, itemIndex) => itemIndex === index ? e.target.value : item))} />)}<Button variant="outline" disabled={submitting || rescheduleSlots.some((value) => !value)} onClick={() => void act({ action: 'createReschedule', timezone: portal.mentorTimezone, slots: rescheduleSlots.map(localValueToIso) }, 'The founder received your reschedule options. The existing booking remains active until a new time is accepted.')}>Send reschedule options</Button></div>
              )}
              <div className="border-t pt-5"><Label htmlFor="cancel-reason">Cancellation reason</Label><Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} /><Button variant="destructive" className="mt-3" disabled={submitting} onClick={() => window.confirm('Cancel this call? The founder will receive a credit refund.') && void act({ action: 'cancelBooking', reason }, 'The call was cancelled and the founder’s eligible credits were refunded.')}>Cancel and refund</Button></div>
            </>}
          </>}
        </CardContent>
      </Card>
    </main>
  </>;
}
