import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CalendarClock,
  Check,
  Clock3,
  Coins,
  Globe2,
  Loader2,
  Video,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import CommunityMentorsWallpaper from '@/components/wallpapers/CommunityMentorsWallpaper';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import {
  formatTimezoneLabel,
  getBookingTimezoneOptions,
  getCurrentTimezoneOffset,
  getMentorCountryForTimezone,
  getMentorTimezone,
} from '@/utils/mentorTimezone';

type BookingStep = 'schedule' | 'details';
type ProposedSlot = { date: string; time: string };
type CoachingFormat = 'Hourly Rate Basis' | '8 Week Coaching Program';

const COACHING_FORMAT_OPTIONS: Array<{ value: CoachingFormat; label: string; description: string }> = [
  { value: 'Hourly Rate Basis', label: 'Hourly Rate', description: 'Flexible support booked by the hour.' },
  { value: '8 Week Coaching Program', label: '8-week coaching', description: 'Structured support over eight weeks.' },
];

function proposedWallTime(slot: ProposedSlot) {
  return slot.date && slot.time ? `${slot.date}T${slot.time}` : '';
}

function buildRequestNotes(coachingFormat: CoachingFormat | '', notes: string) {
  const coachingFormatNote = coachingFormat ? `Preferred coaching format: ${coachingFormat}` : '';
  const additionalNotes = notes.trim() ? `Additional notes: ${notes.trim()}` : '';
  return [coachingFormatNote, additionalNotes].filter(Boolean).join('\n\n');
}

function wallTimeToUtc(value: string, timezone: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;
  const desired = Date.UTC(+match[1], +match[2] - 1, +match[3], +match[4], +match[5]);
  let candidate = desired;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(candidate));
    const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value ?? 0);
    const rendered = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'));
    candidate += desired - rendered;
  }
  return new Date(candidate).toISOString();
}

function isValidTimezone(timezone: string) {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
    return true;
  } catch {
    return false;
  }
}

function dayKey(value: string, timezone: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value));
}

function formatProposedSlot(slot: ProposedSlot, sourceTimezone: string, targetTimezone: string) {
  const utcValue = wallTimeToUtc(proposedWallTime(slot), sourceTimezone);
  if (!utcValue) return '';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: targetTimezone,
  }).format(new Date(utcValue));
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
  const [coachingFormat, setCoachingFormat] = useState<CoachingFormat | ''>('');
  const [notes, setNotes] = useState('');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [slots, setSlots] = useState<ProposedSlot[]>([
    { date: '', time: '' },
    { date: '', time: '' },
    { date: '', time: '' },
  ]);
  const [step, setStep] = useState<BookingStep>('schedule');

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
      })
      .catch((loadError) => active && setError(loadError instanceof Error ? loadError.message : 'Unable to load this mentor.'))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [authLoading, fetchMentorById, id, navigate, user]);

  useEffect(() => {
    if (id) trackDiscoveryCallWorkflow('discovery_call_request_started', { mentor_id: id, source: 'mentor_marketplace' });
  }, [id]);

  const timezoneIsValid = useMemo(() => isValidTimezone(timezone), [timezone]);
  const displayTimezone = timezoneIsValid ? timezone : 'UTC';
  const mentorCountry = mentor ? getMentorCountryForTimezone(mentor) : null;
  const mentorOriginTimezone = mentor ? getMentorTimezone(mentor) : null;
  const configuredMentorTimezone = availability?.mentorTimezone;
  const mentorDisplayTimezone = configuredMentorTimezone && configuredMentorTimezone !== 'UTC'
    ? configuredMentorTimezone
    : mentorOriginTimezone ?? configuredMentorTimezone ?? 'UTC';
  const mentorTimezoneOffset = getCurrentTimezoneOffset(mentorDisplayTimezone) ?? 0;
  const mentorTimezoneLabel = formatTimezoneLabel(mentorTimezoneOffset);
  const timezoneOptions = useMemo(
    () => getBookingTimezoneOptions(new Date(), [timezone, mentorDisplayTimezone]),
    [mentorDisplayTimezone, timezone],
  );

  const scheduleValidationError = useMemo(() => {
    if (!timezoneIsValid) return 'Enter a valid IANA timezone, such as America/Bogota.';
    const normalized = slots.map((slot) => wallTimeToUtc(proposedWallTime(slot), timezone) ?? '');
    if (normalized.some((slot) => !slot)) return 'Choose all three proposed times.';
    if (new Set(normalized).size !== 3) return 'The three proposed times must be different.';
    const minimum = Date.now() + 72 * 60 * 60 * 1000;
    const maximum = Date.now() + 60 * 24 * 60 * 60 * 1000;
    if (normalized.some((slot) => Date.parse(slot) < minimum || Date.parse(slot) > maximum)) {
      return 'Each time must be between 72 hours and 60 days from now.';
    }
    return '';
  }, [slots, timezone, timezoneIsValid]);

  const detailsValidationError = useMemo(() => {
    if (topic.trim().length < 3 || topic.trim().length > 120) return 'Topic must be between 3 and 120 characters.';
    if (!coachingFormat) return 'Choose the coaching format you are interested in.';
    if (desiredOutcome.trim().length < 10 || desiredOutcome.trim().length > 500) return 'Project description must be between 10 and 500 characters.';
    if (buildRequestNotes(coachingFormat, notes).length > 1000) return 'Notes cannot exceed 1,000 characters.';
    return '';
  }, [coachingFormat, desiredOutcome, notes, topic]);

  const validationError = scheduleValidationError || detailsValidationError;
  const hasEnoughCredits = (availability?.quotaStatus.totalCreditsAvailable ?? 0) >= 10;

  const continueToDetails = () => {
    if (scheduleValidationError) {
      setError(scheduleValidationError);
      return;
    }
    setError('');
    setStep('details');
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validationError || !availability?.available) {
      setError(validationError || 'This mentor is not accepting Discovery Calls.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const common = {
        mentorId: id,
        idempotencyKey: idempotencyKey.current,
        topic: topic.trim(),
        desiredOutcome: desiredOutcome.trim(),
        notes: buildRequestNotes(coachingFormat, notes) || undefined,
        timezone,
      };
      const response = await createDiscoveryCallRequest({
        ...common,
        slots: slots.map((slot) => ({ startsAt: wallTimeToUtc(proposedWallTime(slot), timezone)! })),
      });
      if (!response.success) throw new Error(response.error || 'Unable to reserve the Discovery Call.');
      trackDiscoveryCallWorkflow('discovery_call_request_submitted', {
        discovery_call_id: response.callId,
        mentor_id: id,
        status: 'pending_mentor_response',
        source: 'mentor_marketplace',
        booking_mode: 'request',
      });
      navigate(`/mentorship/my-bookings?call=${response.callId}`, { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to reserve the Discovery Call.');
    } finally {
      setSubmitting(false);
    }
  };

  const mentorInitials = mentor?.name
    ?.split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'M';
  return <>
    <Helmet><title>Book a Discovery Call | Creatives Takeover</title><meta name="robots" content="noindex,nofollow" /></Helmet>
    <div className="relative min-h-screen bg-background">
      <CommunityMentorsWallpaper />
      <Navigation />
      <main className="container relative z-10 mx-auto min-h-screen max-w-6xl px-4 pb-20 pt-header-offset">
      <Button variant="ghost" asChild className="mb-5 rounded-full text-muted-foreground hover:text-foreground">
        <Link to={id ? `/mentorship/mentors/${id}` : '/mentorship'}><ArrowLeft className="mr-2 h-4 w-4" />Back to mentor</Link>
      </Button>

      {loading ? <Card className="border-border/60 shadow-xl"><CardContent className="flex items-center justify-center p-16"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Preparing your booking form...</CardContent></Card> :
        <Card className="overflow-hidden rounded-3xl border-border/60 bg-card/95 shadow-2xl backdrop-blur">
          <CardHeader className="border-b border-border/60 bg-gradient-to-r from-primary/10 via-primary/[0.03] to-transparent px-6 py-7 sm:px-10">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16 border-2 border-background shadow-md ring-1 ring-border/70">
                <AvatarImage src={mentor?.picture} alt={mentor?.name || 'Mentor'} />
                <AvatarFallback>{mentorInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-2xl tracking-tight sm:text-3xl"><CalendarClock className="h-6 w-6 text-primary" />Book a Discovery Call</CardTitle>
                <CardDescription className="mt-1.5 text-sm sm:text-base">30 focused minutes with {mentor?.name}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="border-b border-border/60 bg-muted/10 px-6 py-5 sm:px-10">
              <div className="mx-auto flex max-w-xl items-center" aria-label="Booking progress">
                <div className={cn('flex items-center gap-2 text-sm font-semibold', step === 'schedule' ? 'text-primary' : 'text-foreground')}>
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2 shadow-sm', step === 'details' ? 'border-primary bg-primary text-primary-foreground' : 'border-primary bg-primary/10')}>{step === 'details' ? <Check className="h-4 w-4" /> : '1'}</span>
                  Choose times
                </div>
                <div className="mx-4 h-px flex-1 bg-gradient-to-r from-primary/60 to-border" />
                <div className={cn('flex items-center gap-2 text-sm font-semibold', step === 'details' ? 'text-primary' : 'text-muted-foreground')}>
                  <span className={cn('flex h-8 w-8 items-center justify-center rounded-full border-2', step === 'details' ? 'border-primary bg-primary/10' : 'border-border bg-background')}>2</span>
                  Call details
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-b from-background to-muted/[0.08] p-5 sm:p-10">
              {!availability?.featureEnabled && <Alert className="mb-5"><AlertDescription>Discovery Calls are not enabled yet.</AlertDescription></Alert>}
              {availability?.featureEnabled && !availability.available && <Alert className="mb-5"><AlertDescription>This mentor is not accepting Discovery Calls. You can still send them a message.</AlertDescription></Alert>}
              {availability?.featureEnabled && availability.available && !hasEnoughCredits && <Alert variant="destructive" className="mb-5"><AlertDescription>You need 10 available credits. <Link className="font-semibold underline" to="/pricing#credit-packs">Buy credits</Link> or <Link className="font-semibold underline" to="/pricing">compare plans</Link>.</AlertDescription></Alert>}
              {error && <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert>}

              {step === 'schedule' ? <div className="mx-auto max-w-4xl">
                <div className="mb-8 text-center">
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Book a free discovery call</h2>
                  <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">Choose your timezone, then propose three timeslots that work for you. The mentor will receive every option and can confirm one or suggest an alternative.</p>
                </div>

                <div className="mb-6 grid gap-4 md:grid-cols-[1.25fr_1fr]">
                  <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                    <Label htmlFor="timezone" className="text-sm font-semibold">Your timezone</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger id="timezone" className="mt-2 h-12 rounded-xl border-border/70 bg-background px-4" aria-label="Your timezone">
                        <SelectValue placeholder="Choose your timezone" />
                      </SelectTrigger>
                      <SelectContent position="item-aligned" className="max-h-80">
                        {timezoneOptions.map((option) => <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>)}
                      </SelectContent>
                    </Select>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">All proposed times will be saved in this timezone and automatically converted for the mentor.</p>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/[0.06] p-5 shadow-sm">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Globe2 className="h-5 w-5" /></span>
                    <div>
                      <p className="text-sm font-semibold">{mentor?.name || 'Mentor'}'s timezone</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {[mentorCountry, mentorDisplayTimezone, mentorTimezoneLabel].filter(Boolean).join(' · ')}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">You will see the mentor's local time below each option before continuing.</p>
                    </div>
                  </div>
                </div>

                <div className="mb-7 rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-6">
                  <div className="mb-5">
                    <h3 className="text-lg font-semibold tracking-tight">Propose three times</h3>
                    <p className="mt-1 text-sm text-muted-foreground">The mentor can accept one option, suggest another time, or decline within 72 hours.</p>
                  </div>
                  <div className="grid gap-4 lg:grid-cols-3">
                    {slots.map((slot, index) => {
                      const founderPreview = formatProposedSlot(slot, displayTimezone, displayTimezone);
                      const mentorPreview = formatProposedSlot(slot, displayTimezone, mentorDisplayTimezone);
                      return <div key={index} className="rounded-2xl border border-border/70 bg-background p-4 transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10">
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-sm font-semibold">Option {index + 1}</p>
                          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{index + 1}</span>
                        </div>
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor={`slot-date-${index}`} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><CalendarDays className="h-4 w-4 text-primary" />Date</Label>
                            <Input
                              id={`slot-date-${index}`}
                              className="mt-1.5 h-11 rounded-xl border-border/70"
                              type="date"
                              value={slot.date}
                              min={dayKey(new Date(Date.now() + 72 * 60 * 60_000).toISOString(), displayTimezone)}
                              max={dayKey(new Date(Date.now() + 60 * 24 * 60 * 60_000).toISOString(), displayTimezone)}
                              onChange={(event) => setSlots((current) => current.map((value, slotIndex) => slotIndex === index ? { ...value, date: event.target.value } : value))}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`slot-time-${index}`} className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><Clock3 className="h-4 w-4 text-primary" />Time</Label>
                            <Input
                              id={`slot-time-${index}`}
                              className="mt-1.5 h-11 rounded-xl border-border/70"
                              type="time"
                              step={900}
                              value={slot.time}
                              onChange={(event) => setSlots((current) => current.map((value, slotIndex) => slotIndex === index ? { ...value, time: event.target.value } : value))}
                            />
                          </div>
                        </div>
                        {founderPreview && <div className="mt-4 space-y-1.5 border-t border-border/60 pt-3 text-xs leading-relaxed">
                          <p><span className="font-semibold">Your time:</span> {founderPreview} ({formatTimezoneLabel(getCurrentTimezoneOffset(displayTimezone) ?? 0)})</p>
                          <p className="text-muted-foreground"><span className="font-semibold text-foreground">Mentor time:</span> {mentorPreview} ({mentorTimezoneLabel})</p>
                        </div>}
                      </div>;
                    })}
                  </div>
                  <p className="mt-4 text-xs text-muted-foreground">Choose an exact date and time for every option. Each must be between 72 hours and 60 days from now.</p>
                </div>

                <Button className="h-12 w-full rounded-xl text-base font-semibold shadow-lg shadow-primary/15" type="button" disabled={!availability?.available || !hasEnoughCredits || Boolean(scheduleValidationError)} onClick={continueToDetails}>
                  Continue to call details
                </Button>
                {scheduleValidationError && <p className="mt-2 text-center text-sm text-muted-foreground">{scheduleValidationError}</p>}
              </div> :
                <form className="mx-auto max-w-2xl space-y-6" onSubmit={submit}>
                  <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your selection</p>
                        <p className="mt-1.5 font-semibold">Three times proposed for mentor review</p>
                        <p className="mt-1 text-sm text-muted-foreground">30 minutes · {timezone}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => { setStep('schedule'); setError(''); }}>Change</Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="topic" className="font-semibold">Which kind of support are you looking for?</Label>
                    <Input id="topic" className="mt-2 h-12 rounded-xl border-border/70" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={120} placeholder="Fundraising, go-to-market, product strategy..." autoFocus />
                    <p className="mt-1 text-xs text-muted-foreground">A specific topic helps the mentor prepare for your conversation.</p>
                  </div>

                  <fieldset>
                    <legend className="font-semibold">Which coaching format are you interested in?</legend>
                    <RadioGroup
                      className="mt-3 grid gap-3 sm:grid-cols-2"
                      value={coachingFormat}
                      onValueChange={(value) => setCoachingFormat(value as CoachingFormat)}
                    >
                      {COACHING_FORMAT_OPTIONS.map((option) => <Label
                        key={option.value}
                        htmlFor={`coaching-format-${option.value}`}
                        className={cn(
                          'flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-card p-4 font-normal transition-colors hover:border-primary/50 hover:bg-primary/[0.03]',
                          coachingFormat === option.value && 'border-primary bg-primary/[0.06]',
                        )}
                      >
                        <RadioGroupItem id={`coaching-format-${option.value}`} value={option.value} className="mt-0.5" />
                        <span>
                          <span className="block font-semibold text-foreground">{option.label}</span>
                          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{option.description}</span>
                        </span>
                      </Label>)}
                    </RadioGroup>
                  </fieldset>

                  <div>
                    <Label htmlFor="outcome" className="font-semibold">Tell the mentor about your project</Label>
                    <Textarea id="outcome" className="mt-2 min-h-36 rounded-xl border-border/70" value={desiredOutcome} onChange={(event) => setDesiredOutcome(event.target.value)} maxLength={500} placeholder="What are you building, who is it for, what stage are you at, and what is your biggest current challenge?" />
                    <p className="mt-1 text-xs text-muted-foreground">Share enough context for the mentor to understand your project before the call.</p>
                  </div>
                  <details className="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                    <summary className="cursor-pointer text-sm font-semibold">Add optional notes</summary>
                    <div className="mt-3"><Label htmlFor="notes" className="sr-only">Optional notes</Label><Textarea id="notes" className="rounded-xl border-border/70" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={900} placeholder="Links, context, or specific questions for the mentor" /></div>
                  </details>

                  <Alert><Coins className="h-4 w-4" /><AlertDescription>10 credits are held when you confirm. They are charged only after the confirmed time and private Google Meet link both exist.</AlertDescription></Alert>
                  <div className="rounded-xl border border-border/70 bg-card p-4 text-sm shadow-sm">
                    <div className="flex items-center gap-2 font-medium"><Video className="h-4 w-4" />What happens next</div>
                    <p className="mt-2 text-muted-foreground">The mentor receives your three options. Credits remain held until a time and private Google Meet are confirmed.</p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button type="button" variant="outline" className="h-12 rounded-xl sm:w-1/3" onClick={() => { setStep('schedule'); setError(''); }}>Back</Button>
                    <Button className="h-12 rounded-xl font-semibold shadow-lg shadow-primary/15 sm:flex-1" type="submit" disabled={submitting || !availability?.available || !hasEnoughCredits || Boolean(validationError)}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Send request · 10 credits
                    </Button>
                  </div>
                  {detailsValidationError && <p className="text-center text-sm text-muted-foreground">{detailsValidationError}</p>}
                </form>}
            </div>
          </CardContent>
        </Card>}
      </main>
      <Footer />
    </div>
  </>;
}
