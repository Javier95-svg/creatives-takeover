import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  adminOverrideDiscoveryCall,
  listAdminDiscoveryCalls,
  resendDiscoveryCallNotification,
  retryDiscoveryCallAttendanceOperation,
  retryDiscoveryCallCalendarOperation,
} from '@/services/discoveryCallService';

type Row = Record<string, unknown>;
type AdminData = Awaited<ReturnType<typeof listAdminDiscoveryCalls>>;
const value = (row: Row, key: string) => row[key] == null ? '' : String(row[key]);

export default function AdminDiscoveryCallsPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [filter, setFilter] = useState('all');
  const load = useCallback(async () => {
    setLoading(true);
    try { setData(await listAdminDiscoveryCalls()); }
    catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to load Discovery Calls.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const calls = useMemo(() => (data?.calls ?? []).filter((call) => {
    const status = value(call, 'status');
    if (filter === 'all') return true;
    if (filter === 'terminal') return ['completed', 'declined', 'withdrawn', 'expired', 'cancelled_early', 'cancelled_late', 'founder_no_show', 'mentor_no_show'].includes(status);
    if (filter === 'notification_failure') {
      const callId = value(call, 'id');
      const hasFailedDelivery = (data?.notifications ?? []).some((notification) => {
        const deliveryStatus = value(notification, 'provider_delivery_status');
        return value(notification, 'discovery_call_id') === callId
          && (value(notification, 'status') === 'failed' || ['bounced', 'complained', 'failed', 'suppressed'].includes(deliveryStatus));
      });
      const hasOpenAlert = (data?.notificationAlerts ?? []).some((alert) => (
        value(alert, 'discovery_call_id') === callId && value(alert, 'status') === 'open'
      ));
      return hasFailedDelivery || hasOpenAlert;
    }
    if (filter === 'calendar_failure') return (data?.calendarJobs ?? []).some((job) => value(job, 'discovery_call_id') === value(call, 'id') && value(job, 'status') === 'failed');
    if (filter === 'attendance_review') return (data?.attendance ?? []).some((evidence) => value(evidence, 'discovery_call_id') === value(call, 'id') && ['confirmation_required', 'disputed', 'manual_review', 'unavailable'].includes(value(evidence, 'verification_status')));
    return status === filter;
  }), [data, filter]);

  const override = async (callId: string, overrideAction: string, changes: Record<string, unknown> = {}) => {
    const reason = window.prompt('Required audit reason:');
    if (!reason || reason.trim().length < 3) return;
    setBusy(callId);
    try {
      const response = await adminOverrideDiscoveryCall({ callId, overrideAction, reason, ...changes });
      if (!response.success) throw new Error(response.error || 'Admin action failed.');
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Admin action failed.'); }
    finally { setBusy(''); }
  };

  const correctBooking = async (call: Row) => {
    const currentTime = value(call, 'scheduled_for');
    const scheduledFor = window.prompt('Correct scheduled time (ISO 8601 with offset):', currentTime);
    if (!scheduledFor) return;
    const parsed = new Date(scheduledFor);
    if (Number.isNaN(parsed.getTime())) {
      toast.error('Enter a valid ISO 8601 time, including its UTC offset.');
      return;
    }
    await override(value(call, 'id'), 'correct_booking', {
      scheduledFor: parsed.toISOString(),
      meetingUrl: null,
      meetingInstructions: null,
    });
  };

  return <><Helmet><title>Discovery Calls Admin | Creatives Takeover</title><meta name="robots" content="noindex,nofollow" /></Helmet><Navigation /><main className="container mx-auto min-h-screen px-4 pb-16 pt-header-offset"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-3xl font-bold">Discovery Calls</h1><p className="text-muted-foreground">Workflow, credits, Google Meet creation, audit, and email delivery.</p></div><Button variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button></div>
    {(data?.health.length ?? 0) > 0 && <Alert variant="destructive" className="mb-6"><AlertTriangle className="h-4 w-4" /><AlertDescription>{data?.health.length} workflow invariant issue(s) require review. A scheduled call missing its finalized hold or mandatory notifications is launch-blocking.</AlertDescription></Alert>}
    <div className="mb-5 max-w-xs"><Select value={filter} onValueChange={setFilter}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All calls</SelectItem><SelectItem value="pending_mentor_response">Pending mentor</SelectItem><SelectItem value="pending_founder_response">Pending founder</SelectItem><SelectItem value="pending_meeting_creation">Creating Google Meet</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="awaiting_outcome">Awaiting outcome</SelectItem><SelectItem value="attendance_review">Attendance review</SelectItem><SelectItem value="terminal">Terminal</SelectItem><SelectItem value="notification_failure">Notification failure</SelectItem><SelectItem value="calendar_failure">Calendar failure</SelectItem></SelectContent></Select></div>
    {loading ? <Card><CardContent className="flex justify-center p-10"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading…</CardContent></Card> : <div className="space-y-5">{calls.map((call) => {
      const callId = value(call, 'id'); const notifications = (data?.notifications ?? []).filter((row) => value(row, 'discovery_call_id') === callId); const notificationAlerts = (data?.notificationAlerts ?? []).filter((row) => value(row, 'discovery_call_id') === callId && value(row, 'status') === 'open'); const events = (data?.events ?? []).filter((row) => value(row, 'discovery_call_id') === callId); const rounds = (data?.rounds ?? []).filter((row) => value(row, 'discovery_call_id') === callId); const reservation = (data?.reservations ?? []).find((row) => value(row, 'discovery_call_id') === callId); const calendarJobs = (data?.calendarJobs ?? []).filter((row) => value(row, 'discovery_call_id') === callId); const attendance = (data?.attendance ?? []).find((row) => value(row, 'discovery_call_id') === callId); const attendanceJobs = (data?.attendanceJobs ?? []).filter((row) => value(row, 'discovery_call_id') === callId);
      return <Card key={callId}><CardHeader><CardTitle className="flex flex-wrap items-center justify-between gap-2"><span>{value(call, 'mentor_name_snapshot')}</span><Badge variant="outline">{value(call, 'status')}</Badge></CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-2 text-sm md:grid-cols-2"><p><strong>Call:</strong> {callId}</p><p><strong>Founder:</strong> {value(call, 'founder_email_snapshot')}</p><p><strong>Mentor:</strong> {value(call, 'mentor_contact_email_snapshot')}</p><p><strong>Scheduled:</strong> {value(call, 'scheduled_for') ? new Date(value(call, 'scheduled_for')).toLocaleString() : 'Not confirmed'}</p><p><strong>Deadline:</strong> {value(call, 'response_due_at') ? new Date(value(call, 'response_due_at')).toLocaleString() : '—'}</p><p><strong>Credit hold:</strong> {reservation ? `${value(reservation, 'status')} (${value(reservation, 'held_amount')} credits)` : 'Legacy/no hold'}</p><p><strong>Meeting:</strong> {value(call, 'meeting_url') || value(call, 'meeting_creation_status') || 'Not created'}</p><p><strong>Google event:</strong> {value(call, 'external_calendar_event_id') || 'Not created'}</p></div>
        {notificationAlerts.length > 0 && <Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertDescription>{notificationAlerts.map((alert) => value(alert, 'message')).join(' ')}</AlertDescription></Alert>}
        {attendance && <div><h3 className="mb-2 font-semibold">Attendance review</h3><div className="rounded border p-3 text-sm"><p><strong>State:</strong> {value(attendance, 'verification_status')} · <strong>source:</strong> {value(attendance, 'resolution_source') || '—'}</p><p><strong>Derived Meet evidence:</strong> {value(attendance, 'distinct_participant_count')} distinct participants, max {value(attendance, 'max_concurrent_participants')} concurrent, {value(attendance, 'qualifying_overlap_seconds')} qualifying seconds.</p><p><strong>Responses:</strong> founder {value(attendance, 'founder_response') || '—'} · mentor {value(attendance, 'mentor_response') || '—'}</p>{value(attendance, 'last_error_code') && <p className="text-destructive">Last check: {value(attendance, 'last_error_code')}</p>}<p className="text-xs text-muted-foreground">Only derived timing and counts are retained; participant identities and raw Meet payloads are never displayed or stored.</p></div><div className="mt-2 space-y-2">{attendanceJobs.map((job) => <div key={value(job, 'id')} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-xs"><span>{value(job, 'status')} · attempt {value(job, 'attempt_count')}/{value(job, 'max_attempts')}</span>{['failed', 'succeeded'].includes(value(job, 'status')) && <Button size="sm" variant="outline" onClick={() => void retryDiscoveryCallAttendanceOperation(value(job, 'id')).then(load)}>Retry attendance check</Button>}{value(job, 'last_error') && <span className="w-full text-destructive">{value(job, 'last_error')}</span>}</div>)}</div></div>}
        <div><h3 className="mb-2 font-semibold">Notification delivery</h3><div className="space-y-2">{notifications.map((notification) => { const deliveryStatus = value(notification, 'provider_delivery_status') || 'pending'; const failed = value(notification, 'status') === 'failed' || ['bounced', 'complained', 'failed', 'suppressed'].includes(deliveryStatus); return <div key={value(notification, 'id')} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-xs"><span>{value(notification, 'template_key')} → {value(notification, 'recipient_role')} (queue: {value(notification, 'status')}, delivery: {deliveryStatus}, attempt {value(notification, 'attempt_count')})</span>{failed && <Button size="sm" variant="outline" onClick={() => void resendDiscoveryCallNotification(value(notification, 'id')).then(load)}>Resend</Button>}{(value(notification, 'provider_last_error') || value(notification, 'last_error')) && <span className="w-full text-destructive">{value(notification, 'provider_last_error') || value(notification, 'last_error')}</span>}</div>; })}</div></div>
        <div><h3 className="mb-2 font-semibold">Google Calendar operations</h3><div className="space-y-2">{calendarJobs.map((job) => <div key={value(job, 'id')} className="flex flex-wrap items-center justify-between gap-2 rounded border p-2 text-xs"><span><strong>{value(job, 'operation')}</strong> · {value(job, 'status')} · attempt {value(job, 'attempt_count')}/{value(job, 'max_attempts')}</span>{value(job, 'status') === 'failed' && <Button size="sm" variant="outline" onClick={() => void retryDiscoveryCallCalendarOperation(value(job, 'id')).then(load)}>Retry</Button>}{value(job, 'last_error') && <p className="w-full text-destructive">{value(job, 'last_error')}</p>}</div>)}</div></div>
        <details><summary className="cursor-pointer font-semibold">Scheduling rounds ({rounds.length})</summary><div className="mt-2 space-y-2 text-xs">{rounds.map((round) => <div key={value(round, 'id')} className="rounded border p-2"><p><strong>{value(round, 'round_type')}</strong> · {value(round, 'proposer_role')} → {value(round, 'responder_role')} · {value(round, 'status')}</p><p>Due {new Date(value(round, 'response_due_at')).toLocaleString()}</p>{Array.isArray(round.discovery_call_scheduling_slots) && round.discovery_call_scheduling_slots.map((slot) => <p key={value(slot as Row, 'id')}>{new Date(value(slot as Row, 'starts_at')).toLocaleString()}</p>)}</div>)}</div></details>
        <details><summary className="cursor-pointer font-semibold">Audit timeline ({events.length})</summary><div className="mt-2 space-y-2 text-xs">{events.map((event) => <details key={value(event, 'id')} className="rounded border p-2"><summary className="cursor-pointer"><strong>{value(event, 'event_type')}</strong> — {new Date(value(event, 'created_at')).toLocaleString()}</summary><pre className="mt-2 overflow-auto whitespace-pre-wrap">{JSON.stringify(event.payload ?? {}, null, 2)}</pre></details>)}</div></details>
        <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" disabled={busy === callId} onClick={() => void correctBooking(call)}>Correct time/logistics</Button><Button size="sm" disabled={busy === callId} onClick={() => void override(callId, 'completed')}>Mark completed</Button><Button size="sm" variant="outline" disabled={busy === callId} onClick={() => void override(callId, 'founder_no_show')}>Founder no-show</Button><Button size="sm" variant="outline" disabled={busy === callId} onClick={() => void override(callId, 'mentor_no_show')}>Mentor no-show + refund</Button><Button size="sm" variant="destructive" disabled={busy === callId} onClick={() => void override(callId, 'cancel_refund')}>Cancel + refund/release hold</Button><Button size="sm" variant="destructive" disabled={busy === callId} onClick={() => void override(callId, 'cancel_no_refund')}>Cancel, no refund</Button></div>
      </CardContent></Card>;
    })}{calls.length === 0 && <Card><CardContent className="p-10 text-center text-muted-foreground">No calls match this filter.</CardContent></Card>}</div>}
  </main><Footer /></>;
}
