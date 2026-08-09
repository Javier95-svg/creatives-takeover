import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Coins, Loader2 } from 'lucide-react';
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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?return=${encodeURIComponent(`/mentorship/book/${id}`)}`, { replace: true });
      return;
    }
    let active = true;
    void Promise.all([fetchMentorById(id), getDiscoveryCallAvailability(id)])
      .then(([mentorResult, availabilityResult]) => {
        if (!active) return;
        setMentor(mentorResult);
        setAvailability(availabilityResult);
      })
      .catch((loadError) => active && setError(loadError instanceof Error ? loadError.message : 'Unable to load this mentor.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [authLoading, fetchMentorById, id, navigate, user]);

  useEffect(() => {
    if (id) trackDiscoveryCallWorkflow('discovery_call_request_started', { mentor_id: id, source: 'mentor_marketplace' });
  }, [id]);

  const validationError = useMemo(() => {
    if (topic.trim().length < 3 || topic.trim().length > 120) return 'Topic must be between 3 and 120 characters.';
    if (desiredOutcome.trim().length < 10 || desiredOutcome.trim().length > 500) return 'Desired outcome must be between 10 and 500 characters.';
    if (notes.length > 1000) return 'Notes cannot exceed 1,000 characters.';
    let normalized: string[];
    try {
      normalized = slots.map((slot) => wallTimeToUtc(slot, timezone) ?? '');
    } catch {
      return 'Choose a valid IANA timezone.';
    }
    if (normalized.some((slot) => !slot)) return 'Choose all three proposed times.';
    if (new Set(normalized).size !== 3) return 'The three proposed times must be different.';
    const minimum = Date.now() + 72 * 60 * 60 * 1000;
    const maximum = Date.now() + 60 * 24 * 60 * 60 * 1000;
    if (normalized.some((slot) => Date.parse(slot) < minimum || Date.parse(slot) > maximum)) return 'Each time must be between 72 hours and 60 days from now.';
    return '';
  }, [desiredOutcome, notes, slots, timezone, topic]);

  const hasEnoughCredits = (availability?.quotaStatus.totalCreditsAvailable ?? 0) >= 10;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validationError || !availability?.available) {
      setError(validationError || 'This mentor is not accepting Discovery Call requests.');
      return;
    }
    setSubmitting(true); setError('');
    try {
      const response = await createDiscoveryCallRequest({
        mentorId: id, idempotencyKey: idempotencyKey.current,
        topic: topic.trim(), desiredOutcome: desiredOutcome.trim(), notes: notes.trim() || undefined,
        timezone, slots: slots.map((slot) => ({ startsAt: wallTimeToUtc(slot, timezone)! })),
      });
      if (!response.success) throw new Error(response.error || 'Unable to create the Discovery Call request.');
      trackDiscoveryCallWorkflow('discovery_call_request_submitted', { discovery_call_id: response.callId, mentor_id: id, status: 'pending_mentor_response', source: 'mentor_marketplace' });
      navigate(`/mentorship/my-bookings?call=${response.callId}`, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create the request.');
    } finally { setSubmitting(false); }
  };

  return <>
    <Helmet><title>Request a Discovery Call | Creatives Takeover</title><meta name="robots" content="noindex,nofollow" /></Helmet>
    <Navigation />
    <main className="container mx-auto min-h-screen max-w-3xl px-4 pb-16 pt-header-offset">
      <Button variant="ghost" asChild className="mb-4"><Link to={id ? `/mentorship/mentors/${id}` : '/mentorship'}><ArrowLeft className="mr-2 h-4 w-4" />Back to mentor</Link></Button>
      {loading ? <Card><CardContent className="flex items-center justify-center p-12"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading request form…</CardContent></Card> :
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarClock className="h-5 w-5" />Request a Discovery Call with {mentor?.name}</CardTitle><CardDescription>Propose three times. Your mentor will choose one or suggest another.</CardDescription></CardHeader>
          <CardContent>
            {!availability?.featureEnabled && <Alert className="mb-5"><AlertDescription>Discovery Call requests are not enabled yet.</AlertDescription></Alert>}
            {availability?.featureEnabled && !availability.available && <Alert className="mb-5"><AlertDescription>This mentor is not accepting Discovery Call requests. You can still send them a message.</AlertDescription></Alert>}
            {availability?.featureEnabled && availability.available && !hasEnoughCredits && <Alert variant="destructive" className="mb-5"><AlertDescription>You need 10 available credits to place this hold. <Link className="font-semibold underline" to="/pricing#credit-packs">Buy credits</Link> or <Link className="font-semibold underline" to="/pricing">compare plans</Link>.</AlertDescription></Alert>}
            <Alert className="mb-6"><Coins className="h-4 w-4" /><AlertDescription>10 credits will be held now and charged only when the call is confirmed. Unanswered or declined requests release the hold automatically.</AlertDescription></Alert>
            {error && <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert>}
            <form className="space-y-5" onSubmit={submit}>
              <div><Label htmlFor="topic">Topic</Label><Input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={120} placeholder="Fundraising strategy" /></div>
              <div><Label htmlFor="outcome">Desired outcome</Label><Textarea id="outcome" value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)} maxLength={500} placeholder="What decision or next step should this call help you reach?" /></div>
              <div><Label htmlFor="notes">Additional notes (optional)</Label><Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} /></div>
              <div><Label htmlFor="timezone">Your timezone</Label><Input id="timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="America/Bogota" /><p className="mt-1 text-xs text-muted-foreground">Use an IANA timezone such as America/Bogota or Europe/London.</p></div>
              <fieldset className="space-y-3"><legend className="font-medium">Three proposed times</legend>{slots.map((slot, index) => <div key={index}><Label htmlFor={`slot-${index}`}>Option {index + 1}</Label><Input id={`slot-${index}`} type="datetime-local" value={slot} onChange={(e) => setSlots((current) => current.map((value, itemIndex) => itemIndex === index ? e.target.value : value))} /></div>)}</fieldset>
              <Button type="submit" className="w-full" disabled={submitting || !availability?.available || !hasEnoughCredits}><>{submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Hold 10 credits and send request</></Button>
            </form>
          </CardContent>
        </Card>}
    </main>
    <Footer />
  </>;
}
