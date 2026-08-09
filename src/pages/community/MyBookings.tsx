import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Download, Loader2, RotateCcw, Video } from 'lucide-react';
import { toast } from 'sonner';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { trackDiscoveryCallWorkflow, type DiscoveryCallWorkflowEvent } from '@/lib/analytics';
import {
  acceptMentorCounter,
  cancelDiscoveryCall,
  createDiscoveryCallReschedule,
  declineMentorCounter,
  listMyDiscoveryCalls,
  respondToDiscoveryCallReschedule,
  withdrawDiscoveryCallRequest,
  type DiscoveryCallBookingItem,
  type SchedulingRound,
} from '@/services/discoveryCallService';

const terminalStatuses = new Set(['completed', 'declined', 'withdrawn', 'expired', 'cancelled_early', 'cancelled_late', 'founder_no_show', 'mentor_no_show']);
const statusLabels: Record<string, string> = {
  intent_created: 'Legacy attempt', pending_mentor_response: 'Awaiting mentor',
  pending_founder_response: 'Needs your response', pending_meeting_creation: 'Creating secure meeting', scheduled: 'Scheduled', awaiting_outcome: 'Awaiting outcome',
  completed: 'Completed', declined: 'Declined', withdrawn: 'Withdrawn', expired: 'Expired',
  cancelled_early: 'Cancelled — refunded', cancelled_late: 'Cancelled late', founder_no_show: 'Founder no-show', mentor_no_show: 'Mentor no-show — refunded',
};

function downloadCalendar(booking: DiscoveryCallBookingItem) {
  if (!booking.scheduledFor) return;
  const date = (value: Date) => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const start = new Date(booking.scheduledFor);
  const end = new Date(start.getTime() + booking.durationMinutes * 60_000);
  const description = [booking.meetingUrl, booking.meetingInstructions].filter(Boolean).join('\n').replaceAll('\n', '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT', `UID:discovery-call-${booking.id}@creatives-takeover.com`, `SEQUENCE:${booking.calendarSequence}`, `DTSTART:${date(start)}`, `DTEND:${date(end)}`, `SUMMARY:Discovery Call with ${booking.mentorName}`, `DESCRIPTION:${description}`, 'END:VEVENT', 'END:VCALENDAR', ''].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'discovery-call.ics'; anchor.click();
  URL.revokeObjectURL(url);
}

function activeRound(booking: DiscoveryCallBookingItem) {
  return booking.rounds.find((round) => round.status === 'pending') ?? null;
}

export default function MyBookings() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<DiscoveryCallBookingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [rescheduleFor, setRescheduleFor] = useState('');
  const [rescheduleSlots, setRescheduleSlots] = useState(['', '', '']);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await listMyDiscoveryCalls();
      if (response.success) setBookings(response.bookings);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load Discovery Calls.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?return=${encodeURIComponent('/mentorship/my-bookings')}`, { replace: true });
      return;
    }
    void load();
  }, [authLoading, load, navigate, user]);

  useEffect(() => {
    const trackOnce = (event: DiscoveryCallWorkflowEvent, booking: DiscoveryCallBookingItem, discriminator = String(booking.calendarSequence)) => {
      const key = `ct:${event}:${booking.id}:${discriminator}`;
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
      trackDiscoveryCallWorkflow(event, { discovery_call_id: booking.id, mentor_id: booking.mentorId ?? undefined, status: booking.status, source: 'my_bookings' });
    };
    bookings.forEach((booking) => {
      if (booking.status === 'pending_founder_response') trackOnce('discovery_call_counter_received', booking);
      if (booking.status === 'expired') trackOnce('discovery_call_request_expired', booking);
      if (booking.status === 'scheduled') {
        trackOnce(booking.calendarSequence > 0 ? 'discovery_call_rescheduled' : 'discovery_call_confirmed', booking);
      }
      if (booking.status === 'cancelled_early' || booking.status === 'cancelled_late') trackOnce('discovery_call_cancelled', booking);
      const round = activeRound(booking);
      if (round?.round_type === 'reschedule') trackOnce('discovery_call_reschedule_requested', booking, round.id);
    });
  }, [bookings]);

  const groups = useMemo(() => ({
    needsResponse: bookings.filter((booking) => booking.status === 'pending_founder_response' || (activeRound(booking)?.round_type === 'reschedule' && activeRound(booking)?.responder_role === 'founder')),
    awaitingMentor: bookings.filter((booking) => booking.status === 'pending_mentor_response' || (activeRound(booking)?.round_type === 'reschedule' && activeRound(booking)?.responder_role === 'mentor')),
    upcoming: bookings.filter((booking) => booking.status === 'pending_meeting_creation' || (booking.status === 'scheduled' && !activeRound(booking))),
    past: bookings.filter((booking) => terminalStatuses.has(booking.status) || booking.status === 'awaiting_outcome' || booking.status === 'intent_created'),
  }), [bookings]);

  const run = async (bookingId: string, action: () => Promise<{ success: boolean; error?: string }>) => {
    setBusyId(bookingId);
    try { const response = await action(); if (!response.success) throw new Error(response.error || 'Update failed.'); await load(); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Update failed.'); }
    finally { setBusyId(''); }
  };

  const counterReschedule = (booking: DiscoveryCallBookingItem) => {
    const localTime = window.prompt('Counter with one replacement time (for example 2026-08-15T14:00):');
    if (!localTime) return;
    const parsed = new Date(localTime);
    if (Number.isNaN(parsed.getTime())) {
      toast.error('Enter a valid date and time.');
      return;
    }
    void run(booking.id, () => respondToDiscoveryCallReschedule({
      callId: booking.id,
      response: 'counter',
      counterStartsAt: parsed.toISOString(),
    }));
  };

  const renderRound = (booking: DiscoveryCallBookingItem, round: SchedulingRound) => <div className="mt-4 rounded-lg border bg-muted/20 p-4">
    <p className="mb-2 text-sm font-semibold">{round.round_type === 'reschedule' ? 'Proposed replacement times' : 'Mentor-proposed time'}</p>
    <div className="space-y-2">{round.discovery_call_scheduling_slots.map((slot) => <div key={slot.id} className="flex flex-wrap items-center justify-between gap-2"><span>{new Date(slot.starts_at).toLocaleString()}</span>{round.responder_role === 'founder' && <Button size="sm" disabled={busyId === booking.id} onClick={() => void run(booking.id, () => round.round_type === 'initial' ? acceptMentorCounter(booking.id) : respondToDiscoveryCallReschedule({ callId: booking.id, response: 'accept', slotId: slot.id }))}>Accept</Button>}</div>)}</div>
    {round.meeting_url && <a className="mt-2 block text-sm text-primary underline" href={round.meeting_url} target="_blank" rel="noreferrer">{round.meeting_url}</a>}
    {round.meeting_instructions && <p className="mt-2 whitespace-pre-line text-sm">{round.meeting_instructions}</p>}
    {round.responder_role === 'founder' && <div className="mt-3 flex flex-wrap gap-2">{round.round_type === 'reschedule' && round.counter_depth < 1 && <Button size="sm" variant="outline" disabled={busyId === booking.id} onClick={() => counterReschedule(booking)}>Counter once</Button>}<Button size="sm" variant="outline" disabled={busyId === booking.id} onClick={() => void run(booking.id, () => round.round_type === 'initial' ? declineMentorCounter(booking.id) : respondToDiscoveryCallReschedule({ callId: booking.id, response: 'decline' }))}>Decline</Button></div>}
    <p className="mt-2 text-xs text-muted-foreground">Respond by {new Date(round.response_due_at).toLocaleString()}</p>
  </div>;

  const renderCard = (booking: DiscoveryCallBookingItem) => {
    const round = activeRound(booking);
    const pending = booking.status === 'pending_mentor_response' || booking.status === 'pending_founder_response';
    const creatingMeeting = booking.status === 'pending_meeting_creation';
    const earlyRefund = booking.scheduledFor && Date.now() <= Date.parse(booking.scheduledFor) - 24 * 60 * 60 * 1000;
    const refundResult = booking.reservation?.metadata?.refundResult as Record<string, unknown> | undefined;
    return <Card key={booking.id} id={`call-${booking.id}`}><CardContent className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-semibold">{booking.mentorName}</h3>{booking.topic && <p className="mt-1 text-sm">{booking.topic}</p>}</div><Badge variant={booking.status.startsWith('cancelled') ? 'destructive' : 'outline'}>{statusLabels[booking.status] ?? booking.status}</Badge></div>
      <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted-foreground">
        {booking.scheduledFor && <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{new Date(booking.scheduledFor).toLocaleString()}</span>}
        <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{booking.durationMinutes} minutes</span>
        {booking.reservation?.status === 'pending' && <span>10 credits held</span>}
        {booking.creditsCharged && <span>{booking.creditChargeAmount} credits charged</span>}
        {booking.creditsRefunded && <span>Credits refunded</span>}
      </div>
      {booking.desiredOutcome && <p className="mt-3 text-sm text-muted-foreground">Goal: {booking.desiredOutcome}</p>}
      {booking.responseDueAt && pending && <p className="mt-2 text-xs text-muted-foreground">Response deadline: {new Date(booking.responseDueAt).toLocaleString()}</p>}
      {creatingMeeting && <Alert className="mt-4"><Loader2 className="h-4 w-4 animate-spin" /><AlertDescription>Your time is reserved and 10 credits remain held while the private Google Meet room is created. Refresh shortly; credits are not charged until the link exists.</AlertDescription></Alert>}
      {round && renderRound(booking, round)}
      {booking.meetingUrl && <Button asChild size="sm" variant="outline" className="mt-4"><a href={booking.meetingUrl} target="_blank" rel="noreferrer"><Video className="mr-2 h-4 w-4" />Join meeting</a></Button>}
      {booking.meetingInstructions && <p className="mt-3 whitespace-pre-line rounded-lg bg-muted p-3 text-sm">{booking.meetingInstructions}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {booking.externalCalendarHtmlUrl ? <Button size="sm" variant="outline" asChild><a href={booking.externalCalendarHtmlUrl} target="_blank" rel="noreferrer"><Calendar className="mr-2 h-4 w-4" />Open calendar event</a></Button> : booking.scheduledFor && booking.status === 'scheduled' ? <Button size="sm" variant="outline" onClick={() => downloadCalendar(booking)}><Download className="mr-2 h-4 w-4" />Add to calendar</Button> : null}
        {pending && <Button size="sm" variant="destructive" disabled={busyId === booking.id} onClick={() => window.confirm('Withdraw this request and release the 10-credit hold?') && void run(booking.id, () => withdrawDiscoveryCallRequest(booking.id))}>Withdraw request</Button>}
        {creatingMeeting && <Button size="sm" variant="destructive" disabled={busyId === booking.id} onClick={() => window.confirm('Cancel this reservation and release the 10-credit hold?') && void run(booking.id, () => cancelDiscoveryCall(booking.id, 'Founder cancelled while meeting link was being created'))}>Cancel reservation</Button>}
        {booking.status === 'scheduled' && !round && <><Button size="sm" variant="outline" onClick={() => setRescheduleFor(rescheduleFor === booking.id ? '' : booking.id)}><RotateCcw className="mr-2 h-4 w-4" />Reschedule</Button><Button size="sm" variant="destructive" disabled={busyId === booking.id} onClick={() => { const reason = window.prompt(`Why are you cancelling? ${earlyRefund ? 'This cancellation qualifies for a refund.' : 'This is inside 24 hours and will not be refunded.'}`); if (reason) void run(booking.id, () => cancelDiscoveryCall(booking.id, reason)); }}>Cancel</Button></>}
      </div>
      {rescheduleFor === booking.id && <div className="mt-4 rounded-lg border p-4"><p className="mb-3 text-sm font-semibold">Propose three replacement times</p>{rescheduleSlots.map((value, index) => <Input key={index} type="datetime-local" className="mb-2" value={value} onChange={(e) => setRescheduleSlots((current) => current.map((item, itemIndex) => itemIndex === index ? e.target.value : item))} />)}<Button size="sm" disabled={rescheduleSlots.some((value) => !value) || busyId === booking.id} onClick={() => void run(booking.id, () => createDiscoveryCallReschedule({ callId: booking.id, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, slots: rescheduleSlots.map((value) => new Date(value).toISOString()) }))}>Send reschedule request</Button></div>}
      {booking.cancelledReason && <p className="mt-3 text-sm text-muted-foreground">Reason: {booking.cancelledReason}</p>}
      {refundResult && <p className="mt-2 text-xs text-muted-foreground">Refund transaction: {String(booking.reservation?.refund_transaction_id ?? 'not created')} · monthly credits restored: {String(refundResult.restoredToMonthlyQuota ?? 0)} · persistent credits restored: {String(refundResult.restoredToPersistentBalance ?? 0)}{Number(refundResult.expiredMonthlyCreditsNotRestored ?? 0) > 0 ? ` · expired monthly credits not restored: ${String(refundResult.expiredMonthlyCreditsNotRestored)}` : ''}</p>}
    </CardContent></Card>;
  };

  const section = (title: string, items: DiscoveryCallBookingItem[], empty: string) => <section className="mb-10"><h2 className="mb-4 text-2xl font-semibold">{title}</h2>{items.length ? <div className="grid gap-4">{items.map(renderCard)}</div> : <Card><CardContent className="p-8 text-center text-muted-foreground">{empty}</CardContent></Card>}</section>;

  return <><Helmet><title>My Discovery Calls | Creatives Takeover</title><meta name="robots" content="noindex,nofollow" /></Helmet><Navigation /><main className="container mx-auto min-h-screen px-4 pb-16 pt-header-offset"><Button variant="ghost" asChild className="mb-4"><Link to="/mentorship"><ArrowLeft className="mr-2 h-4 w-4" />Back to Marketplace</Link></Button><h1 className="mb-2 text-3xl font-bold">My Discovery Calls</h1><p className="mb-8 text-muted-foreground">Requests, confirmed calls, credit holds, and scheduling updates.</p>{loading ? <Alert><Loader2 className="h-4 w-4 animate-spin" /><AlertDescription>Loading Discovery Calls…</AlertDescription></Alert> : <>{section('Needs your response', groups.needsResponse, 'No Discovery Calls need your response.')}{section('Awaiting mentor', groups.awaitingMentor, 'No requests are waiting on a mentor.')}{section('Upcoming', groups.upcoming, 'You have no confirmed upcoming calls.')}{section('Past', groups.past, 'No past Discovery Calls.')}</>}</main><Footer /></>;
}
