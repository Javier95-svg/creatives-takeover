import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Coins, Loader2, Video } from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useMentors } from '@/hooks/useMentors';
import {
  createDiscoveryCallRequest,
  createInstantDiscoveryCallBooking,
  getDiscoveryCallAvailability,
  type DiscoveryCallAvailability,
} from '@/services/discoveryCallService';
import type { Mentor } from '@/types/mentor';
import { trackDiscoveryCallWorkflow } from '@/lib/analytics';

function wallTimeToUtc(value: string, timezone: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  const desired = Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5]);
  let candidate = desired;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(candidate));
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const rendered = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
    candidate += desired - rendered;
  }
  return new Date(candidate).toISOString();
}

function dayKey(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
}

export default function MentorBookingPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { fetchMentorById } = useMentors();
  const idempotencyKey = useRef(crypto.randomUUID());
  const [mentor, setMentor] = useState<Mentor | null>(null);
  const [availability, setAvailability] = useState<DiscoveryCallAvailability | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [topic, setTopic] = useState('');
  const [desiredOutcome, setDesiredOutcome] = useState('');
  const [notes, setNotes] = useState('');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [slots, setSlots] = useState(['', '', '']);
  const [selectedInstantSlot, setSelectedInstantSlot] = useState('');
  const [bookingPath, setBookingPath] = useState<'instant' | 'request'>('request');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?return=${encodeURIComponent(`/mentorship/book/${id}`)}`, { replace: true });
      return;
    }
    let active = true;
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString();
    void Promise.all([fetchMentorById(id), getDiscoveryCallAvailability(id, { from, to })])
      .then(([mentorResult, availabilityResult]) => {
        if (!active) return;
        setMentor(mentorResult);
        setAvailability(availabilityResult);
        if (availabilityResult.slots.length && ['instant', 'hybrid'].includes(availabilityResult.bookingMode)) setBookingPath('instant');
      })
      .catch((loadError) => active && setError(loadError instanceof Error ? loadError.message : 'Unable to load this mentor.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [authLoading, fetchMentorById, id, navigate, user]);

  useEffect(() => {
    if (id) trackDiscoveryCallWorkflow('discovery_call_request_started', { mentor_id: id, source: 'mentor_marketplace' });
  }, [id]);

  const instantSlotsByDay = useMemo(() => {
    const grouped = new Map<string, Array<{ startsAt: string; durationMinutes: number }>>();
    for (const slot of availability?.slots ?? []) {
      const key = dayKey(slot.startsAt, timezone);
      grouped.set(key, [...(grouped.get(key) ?? []), slot]);
    }
    return [...grouped.entries()].slice(0, 14);
  }, [availability?.slots, timezone]);

  const validationError = useMemo(() => {
    if (topic.trim().length < 3 || topic.trim().length > 120) return 'Topic must be between 3 and 120 characters.';
    if (desiredOutcome.trim().length < 10 || desiredOutcome.trim().length > 500) return 'Desired outcome must be between 10 and 500 characters.';
    if (notes.length > 1000) return 'Notes cannot exceed 1,000 characters.';
    if (bookingPath === 'instant') return selectedInstantSlot ? '' : 'Choose one available time.';
    if (availability?.bookingMode === 'instant' && availability.allowRequestFallback === false) return 'This mentor has no bookable times in the next 30 days.';
    let normalized: string[];
    try { normalized = slots.map((slot) => wallTimeToUtc(slot, timezone) ?? ''); }
    catch { return 'Choose a valid IANA timezone.'; }
    if (normalized.some((slot) => !slot)) return 'Choose all three proposed times.';
    if (new Set(normalized).size !== 3) return 'The three proposed times must be different.';
    const minimum = Date.now() + 72 * 60 * 60 * 1000;
    const maximum = Date.now() + 60 * 24 * 60 * 60 * 1000;
    if (normalized.some((slot) => Date.parse(slot) < minimum || Date.parse(slot) > maximum)) return 'Each time must be between 72 hours and 60 days from now.';
    return '';
  }, [availability?.allowRequestFallback, availability?.bookingMode, bookingPath, desiredOutcome, notes, selectedInstantSlot, slots, timezone, topic]);

  const hasEnoughCredits = (availability?.quotaStatus.totalCreditsAvailable ?? 0) >= 10;
  const canRequestFallback = availability?.bookingMode === 'request' || availability?.bookingMode === 'hybrid' || availability?.allowRequestFallback;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validationError || !availability?.available) {
      setError(validationError || 'This mentor is not accepting Discovery Calls.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const common = {
        mentorId: id, idempotencyKey: idempotencyKey.current,
        topic: topic.trim(), desiredOutcome: desiredOutcome.trim(), notes: notes.trim() || undefined, timezone,
      };
      const response = bookingPath === 'instant'
        ? await createInstantDiscoveryCallBooking({ ...common, startsAt: selectedInstantSlot })
        : await createDiscoveryCallRequest({ ...common, slots: slots.map((slot) => ({ startsAt: wallTimeToUtc(slot, timezone)! })) });
      if (!response.success) throw new Error(response.error || 'Unable to reserve the Discovery Call.');
      trackDiscoveryCallWorkflow('discovery_call_request_submitted', {
        discovery_call_id: response.callId, mentor_id: id,
        status: bookingPath === 'instant' ? 'pending_meeting_creation' : 'pending_mentor_response',
        source: 'mentor_marketplace', booking_mode: bookingPath,
      });
      navigate(`/mentorship/my-bookings?call=${response.callId}`, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to reserve the Discovery Call.');
    } finally { setSubmitting(false); }
  };

  return <>
    <Helmet><title>Book a Discovery Call | Creatives Takeover</title><meta name="robots" content="noindex,nofollow" /></Helmet>
    <Navigation />
    <main className="container mx-auto min-h-screen max-w-4xl px-4 pb-16 pt-header-offset">
      <Button variant="ghost" asChild className="mb-4"><Link to={id ? `/mentorship/mentors/${id}` : '/mentorship'}><ArrowLeft className="mr-2 h-4 w-4" />Back to mentor</Link></Button>
      {loading ? <Card><CardContent className="flex items-center justify-center p-12"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading available times…</CardContent></Card> :
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Discovery Call with {mentor?.name}</CardTitle><CardDescription>Choose an available 30-minute time or send three alternatives.</CardDescription></CardHeader>
          <CardContent>
            {!availability?.featureEnabled && <Alert className="mb-5"><AlertDescription>Discovery Calls are not enabled yet.</AlertDescription></Alert>}
            {availability?.featureEnabled && !availability.available && <Alert className="mb-5"><AlertDescription>This mentor is not accepting Discovery Calls. You can still send them a message.</AlertDescription></Alert>}
            {availability?.featureEnabled && availability.available && !hasEnoughCredits && <Alert variant="destructive" className="mb-5"><AlertDescription>You need 10 available credits. <Link className="font-semibold underline" to="/pricing#credit-packs">Buy credits</Link> or <Link className="font-semibold underline" to="/pricing">compare plans</Link>.</AlertDescription></Alert>}
            <Alert className="mb-6"><Coins className="h-4 w-4" /><AlertDescription>10 credits are held when you submit. They are charged only after the confirmed time and private Google Meet link both exist.</AlertDescription></Alert>
            {error && <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert>}

            {(instantSlotsByDay.length > 0 || canRequestFallback) && <div className="mb-6 flex flex-wrap gap-2">
              {instantSlotsByDay.length > 0 && <Button type="button" variant={bookingPath === 'instant' ? 'default' : 'outline'} onClick={() => setBookingPath('instant')}>Choose an available time</Button>}
              {canRequestFallback && <Button type="button" variant={bookingPath === 'request' ? 'default' : 'outline'} onClick={() => setBookingPath('request')}>Propose three times</Button>}
            </div>}

            <form className="space-y-5" onSubmit={submit}>
              <div><Label htmlFor="topic">Topic</Label><Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={120} placeholder="Fundraising strategy" /></div>
              <div><Label htmlFor="outcome">Desired outcome</Label><Textarea id="outcome" value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)} maxLength={500} placeholder="What decision or next step should this call help you reach?" /></div>
              <div><Label htmlFor="notes">Optional notes</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></div>
              <div><Label htmlFor="timezone">Your timezone</Label><Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Bogota" /><p className="mt-1 text-xs text-muted-foreground">Available times are converted automatically. The calendar invitation also includes UTC.</p></div>

              {bookingPath === 'instant' ? <div className="space-y-4">
                <div className="flex items-center gap-2"><Video className="h-4 w-4" /><p className="font-medium">Available times</p></div>
                {instantSlotsByDay.map(([day, daySlots]) => <section key={day} className="rounded-lg border p-4">
                  <h3 className="mb-3 font-semibold">{new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeZone: timezone }).format(new Date(daySlots[0].startsAt))}</h3>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">{daySlots.map((slot) => <Button key={slot.startsAt} type="button" variant={selectedInstantSlot === slot.startsAt ? 'default' : 'outline'} onClick={() => setSelectedInstantSlot(slot.startsAt)}>{new Intl.DateTimeFormat(undefined, { timeStyle: 'short', timeZone: timezone }).format(new Date(slot.startsAt))}</Button>)}</div>
                </section>)}
                {!instantSlotsByDay.length && <Alert><AlertDescription>No instant times are available in the next 30 days. Propose three alternatives instead.</AlertDescription></Alert>}
              </div> : <div className="space-y-3">
                <p className="font-medium">Propose exactly three times</p>
                {slots.map((value, index) => <div key={index}><Label htmlFor={`slot-${index}`}>Option {index + 1}</Label><Input id={`slot-${index}`} type="datetime-local" value={value} onChange={(event) => setSlots((current) => current.map((slot, slotIndex) => slotIndex === index ? event.target.value : slot))} /></div>)}
                <p className="text-xs text-muted-foreground">Each option must be 72 hours to 60 days away. The mentor has 72 hours to accept, counter, or decline.</p>
              </div>}

              <Button className="w-full" type="submit" disabled={submitting || !availability?.available || !hasEnoughCredits || Boolean(validationError)}>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{bookingPath === 'instant' ? 'Reserve Discovery Call · 10 credits' : 'Send Discovery Call request · 10 credits'}</Button>
              {validationError && <p className="text-center text-sm text-muted-foreground">{validationError}</p>}
            </form>
          </CardContent>
        </Card>}
    </main>
    <Footer />
  </>;
}
