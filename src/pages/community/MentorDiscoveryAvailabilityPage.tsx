import { useCallback, useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { CalendarClock, CheckCircle2, Loader2, Plus, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  addMentorAvailabilityException,
  beginMentorGoogleCalendarConnect,
  deleteMentorAvailabilityException,
  disconnectMentorGoogleCalendar,
  loadMentorAvailabilityPortal,
  saveMentorAvailability,
  type MentorAvailabilityException,
  type MentorAvailabilityPortalData,
} from '@/services/discoveryCallService';

const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
type Rule = { weekday: number; enabled: boolean; startLocalTime: string; endLocalTime: string };

function fragmentData() {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const result = { token: params.get('token') ?? '', google: params.get('google') ?? '' };
  if (window.location.hash) window.history.replaceState(null, '', window.location.pathname);
  return result;
}

export default function MentorDiscoveryAvailabilityPage() {
  const [{ token, google }] = useState(fragmentData);
  const [data, setData] = useState<MentorAvailabilityPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [bookingMode, setBookingMode] = useState<'request' | 'instant' | 'hybrid'>('request');
  const [timezone, setTimezone] = useState(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [notice, setNotice] = useState(72);
  const [windowDays, setWindowDays] = useState(60);
  const [buffer, setBuffer] = useState(0);
  const [allowFallback, setAllowFallback] = useState(true);
  const [rules, setRules] = useState<Rule[]>(weekdays.map((_, weekday) => ({ weekday, enabled: false, startLocalTime: '09:00', endLocalTime: '17:00' })));
  const [exceptionType, setExceptionType] = useState<'unavailable' | 'additional'>('unavailable');
  const [exceptionStart, setExceptionStart] = useState('');
  const [exceptionEnd, setExceptionEnd] = useState('');
  const [exceptionReason, setExceptionReason] = useState('');

  const load = useCallback(async () => {
    if (!token) { setError('This secure availability link is missing or invalid.'); setLoading(false); return; }
    setLoading(true);
    try {
      const response = await loadMentorAvailabilityPortal(token);
      if (!response.success || !response.mentor || !response.settings) throw new Error('This secure availability link has expired or was revoked.');
      const portal = response as { success: boolean } & MentorAvailabilityPortalData;
      setData(portal);
      setBookingMode(portal.settings.booking_mode);
      setTimezone(portal.settings.scheduling_timezone);
      setNotice(portal.settings.minimum_notice_hours);
      setWindowDays(portal.settings.booking_window_days);
      setBuffer(portal.settings.buffer_minutes);
      setAllowFallback(portal.settings.allow_request_fallback);
      setRules(weekdays.map((_, weekday) => {
        const found = portal.rules.find((rule) => rule.weekday === weekday);
        return { weekday, enabled: found?.enabled ?? false, startLocalTime: found?.start_local_time?.slice(0, 5) ?? '09:00', endLocalTime: found?.end_local_time?.slice(0, 5) ?? '17:00' };
      }));
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : 'Unable to load availability.'); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      const response = await saveMentorAvailability(token, {
        bookingMode, timezone, minimumNoticeHours: notice, bookingWindowDays: windowDays,
        bufferMinutes: buffer, allowRequestFallback: allowFallback,
        rules: rules.filter((rule) => rule.enabled),
      });
      if (!response.success) throw new Error(response.error || 'Unable to save availability.');
      setSaved(true);
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : 'Unable to save availability.'); }
    finally { setSaving(false); }
  };

  const addException = async () => {
    try {
      const response = await addMentorAvailabilityException(token, {
        exceptionType, startsAt: new Date(exceptionStart).toISOString(), endsAt: new Date(exceptionEnd).toISOString(), reason: exceptionReason,
      });
      if (!response.success) throw new Error(response.error || 'Unable to add calendar exception.');
      setExceptionStart(''); setExceptionEnd(''); setExceptionReason(''); await load();
    } catch (exceptionError) { setError(exceptionError instanceof Error ? exceptionError.message : 'Unable to add calendar exception.'); }
  };

  const connectGoogle = async () => {
    try {
      const response = await beginMentorGoogleCalendarConnect(token);
      if (!response.success || !response.authorizationUrl) throw new Error(response.error || 'Google Calendar connection is unavailable.');
      window.location.assign(response.authorizationUrl);
    } catch (connectError) { setError(connectError instanceof Error ? connectError.message : 'Unable to connect Google Calendar.'); }
  };

  if (loading) return <main className="flex min-h-screen items-center justify-center"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading availability…</main>;

  return <>
    <Helmet><title>Manage Discovery Call availability | Creatives Takeover</title><meta name="robots" content="noindex,nofollow" /><meta name="referrer" content="no-referrer" /></Helmet>
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-12">
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Discovery Call availability{data?.mentor ? ` · ${data.mentor.name}` : ''}</CardTitle><CardDescription>This private page controls the times founders can book. It does not require a Creatives Takeover account.</CardDescription></CardHeader>
        <CardContent className="space-y-8">
          {google === 'connected' && <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>Google Calendar connected. Busy events will automatically block matching Discovery Call times.</AlertDescription></Alert>}
          {google === 'error' && <Alert variant="destructive"><AlertDescription>Google Calendar could not be connected. Your platform availability is unchanged.</AlertDescription></Alert>}
          {error && <Alert variant="destructive"><AlertDescription>{error} Contact admin@creatives-takeover.com if you need a new secure link.</AlertDescription></Alert>}
          {saved && <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>Availability saved.</AlertDescription></Alert>}
          {data && <>
            <section className="grid gap-4 sm:grid-cols-2">
              <div><Label>Booking mode</Label><Select value={bookingMode} onValueChange={(value) => setBookingMode(value as typeof bookingMode)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="instant">Instant booking</SelectItem><SelectItem value="hybrid">Instant + request fallback</SelectItem><SelectItem value="request">Three-time request only</SelectItem></SelectContent></Select></div>
              <div><Label htmlFor="timezone">Timezone</Label><Input id="timezone" value={timezone} onChange={(event) => setTimezone(event.target.value)} /></div>
              <div><Label htmlFor="notice">Minimum notice (hours)</Label><Input id="notice" type="number" min={1} max={720} value={notice} onChange={(event) => setNotice(Number(event.target.value))} /></div>
              <div><Label htmlFor="window">Booking window (days)</Label><Input id="window" type="number" min={1} max={60} value={windowDays} onChange={(event) => setWindowDays(Number(event.target.value))} /></div>
              <div><Label htmlFor="buffer">Buffer around calls (minutes)</Label><Input id="buffer" type="number" min={0} max={120} value={buffer} onChange={(event) => setBuffer(Number(event.target.value))} /></div>
              <div className="flex items-center justify-between rounded-lg border p-4"><div><Label htmlFor="fallback">Allow request fallback</Label><p className="text-xs text-muted-foreground">Founders can propose three times when no slot works.</p></div><Switch id="fallback" checked={allowFallback} onCheckedChange={setAllowFallback} /></div>
            </section>

            <section><h2 className="mb-1 text-lg font-semibold">Weekly availability</h2><p className="mb-4 text-sm text-muted-foreground">Times repeat every week in {timezone}.</p><div className="space-y-2">{rules.map((rule) => <div key={rule.weekday} className="grid items-center gap-3 rounded-lg border p-3 sm:grid-cols-[140px_1fr_1fr]">
              <label className="flex items-center gap-2"><Switch checked={rule.enabled} onCheckedChange={(enabled) => setRules((current) => current.map((item) => item.weekday === rule.weekday ? { ...item, enabled } : item))} />{weekdays[rule.weekday]}</label>
              <Input type="time" disabled={!rule.enabled} value={rule.startLocalTime} onChange={(event) => setRules((current) => current.map((item) => item.weekday === rule.weekday ? { ...item, startLocalTime: event.target.value } : item))} />
              <Input type="time" disabled={!rule.enabled} value={rule.endLocalTime} onChange={(event) => setRules((current) => current.map((item) => item.weekday === rule.weekday ? { ...item, endLocalTime: event.target.value } : item))} />
            </div>)}</div></section>

            <section><h2 className="mb-1 text-lg font-semibold">Google Calendar busy-time protection</h2><p className="mb-3 text-sm text-muted-foreground">Optional read-only connection. Existing calendar events block availability; Creatives Takeover never exposes event titles or attendees.</p>{data.calendarConnection?.status === 'active' ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4"><div><p className="font-medium">Connected as {data.calendarConnection.google_account_email || 'Google account'}</p><p className="text-xs text-muted-foreground">Last synchronized: {data.calendarConnection.last_synced_at ? new Date(data.calendarConnection.last_synced_at).toLocaleString() : 'pending'}</p></div><Button variant="outline" onClick={() => void disconnectMentorGoogleCalendar(token).then(load)}>Disconnect</Button></div> : <Button variant="outline" onClick={() => void connectGoogle()}>Connect Google Calendar</Button>}</section>

            <section><h2 className="mb-1 text-lg font-semibold">Time off or extra availability</h2><div className="grid gap-2 sm:grid-cols-2"><Select value={exceptionType} onValueChange={(value) => setExceptionType(value as typeof exceptionType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unavailable">Unavailable / time off</SelectItem><SelectItem value="additional">Additional availability</SelectItem></SelectContent></Select><Input placeholder="Reason (optional)" value={exceptionReason} onChange={(event) => setExceptionReason(event.target.value)} /><Input type="datetime-local" value={exceptionStart} onChange={(event) => setExceptionStart(event.target.value)} /><Input type="datetime-local" value={exceptionEnd} onChange={(event) => setExceptionEnd(event.target.value)} /></div><Button className="mt-3" variant="outline" disabled={!exceptionStart || !exceptionEnd} onClick={() => void addException()}><Plus className="mr-2 h-4 w-4" />Add exception</Button><div className="mt-3 space-y-2">{data.exceptions.map((exception: MentorAvailabilityException) => <div key={exception.id} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"><span>{exception.exception_type === 'unavailable' ? 'Unavailable' : 'Additional'} · {new Date(exception.starts_at).toLocaleString()} – {new Date(exception.ends_at).toLocaleString()}{exception.reason ? ` · ${exception.reason}` : ''}</span><Button size="icon" variant="ghost" onClick={() => void deleteMentorAvailabilityException(token, exception.id).then(load)}><Trash2 className="h-4 w-4" /></Button></div>)}</div></section>

            <Button className="w-full" disabled={saving} onClick={() => void save()}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save availability</Button>
          </>}
        </CardContent>
      </Card>
    </main>
  </>;
}
