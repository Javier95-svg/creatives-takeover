import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CalendarDays,
  CalendarClock,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Globe2,
  Loader2,
  Video,
} from 'lucide-react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  createInstantDiscoveryCallBooking,
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

type BookingPath = 'instant' | 'request';
type BookingStep = 'schedule' | 'details';
type InstantSlot = { startsAt: string; durationMinutes: number };
type ProposedSlot = { date: string; time: string };

function proposedWallTime(slot: ProposedSlot) {
  return slot.date && slot.time ? `${slot.date}T${slot.time}` : '';
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

function addDaysToKey(value: string, days: number) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 12));
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, '0'), String(date.getUTCDate()).padStart(2, '0')].join('-');
}

function startOfWeekKey(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return addDaysToKey(value, -date.getUTCDay());
}

function calendarDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

function formatCalendarDate(value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(calendarDate(value));
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
  const [notes, setNotes] = useState('');
  const [timezone, setTimezone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  const [slots, setSlots] = useState<ProposedSlot[]>([
    { date: '', time: '' },
    { date: '', time: '' },
    { date: '', time: '' },
  ]);
  const [selectedInstantSlot, setSelectedInstantSlot] = useState('');
  const [selectedCalendarDay, setSelectedCalendarDay] = useState('');
  const [calendarWeekStart, setCalendarWeekStart] = useState('');
  const [bookingPath, setBookingPath] = useState<BookingPath>('request');
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
        if (availabilityResult.slots.length && ['instant', 'hybrid'].includes(availabilityResult.bookingMode)) {
          setBookingPath('instant');
        }
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

  const instantSlotsByDay = useMemo(() => {
    const grouped = new Map<string, InstantSlot[]>();
    for (const slot of availability?.slots ?? []) {
      const key = dayKey(slot.startsAt, displayTimezone);
      grouped.set(key, [...(grouped.get(key) ?? []), slot]);
    }
    return [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [availability?.slots, displayTimezone]);

  const instantSlotsByDayMap = useMemo(() => new Map(instantSlotsByDay), [instantSlotsByDay]);
  const firstAvailableDay = instantSlotsByDay[0]?.[0] ?? '';

  useEffect(() => {
    if (!firstAvailableDay || selectedCalendarDay) return;
    setSelectedCalendarDay(firstAvailableDay);
    setCalendarWeekStart(startOfWeekKey(firstAvailableDay));
  }, [firstAvailableDay, selectedCalendarDay]);

  const todayKey = dayKey(new Date().toISOString(), displayTimezone);
  const firstCalendarWeek = startOfWeekKey(todayKey);
  const lastCalendarWeek = startOfWeekKey(addDaysToKey(todayKey, 29));
  const visibleWeekStart = calendarWeekStart || startOfWeekKey(firstAvailableDay || todayKey);
  const visibleWeekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDaysToKey(visibleWeekStart, index)),
    [visibleWeekStart],
  );
  const selectedDaySlots = instantSlotsByDayMap.get(selectedCalendarDay) ?? [];
  const canRequestFallback = availability?.bookingMode === 'request'
    || availability?.bookingMode === 'hybrid'
    || availability?.allowRequestFallback;

  const scheduleValidationError = useMemo(() => {
    if (!timezoneIsValid) return 'Enter a valid IANA timezone, such as America/Bogota.';
    if (bookingPath === 'instant') return selectedInstantSlot ? '' : 'Choose one available time.';
    if (availability?.bookingMode === 'instant' && availability.allowRequestFallback === false) {
      return 'This mentor has no bookable times in the next 30 days.';
    }
    const normalized = slots.map((slot) => wallTimeToUtc(proposedWallTime(slot), timezone) ?? '');
    if (normalized.some((slot) => !slot)) return 'Choose all three proposed times.';
    if (new Set(normalized).size !== 3) return 'The three proposed times must be different.';
    const minimum = Date.now() + 72 * 60 * 60 * 1000;
    const maximum = Date.now() + 60 * 24 * 60 * 60 * 1000;
    if (normalized.some((slot) => Date.parse(slot) < minimum || Date.parse(slot) > maximum)) {
      return 'Each time must be between 72 hours and 60 days from now.';
    }
    return '';
  }, [availability?.allowRequestFallback, availability?.bookingMode, bookingPath, selectedInstantSlot, slots, timezone, timezoneIsValid]);

  const detailsValidationError = useMemo(() => {
    if (topic.trim().length < 3 || topic.trim().length > 120) return 'Topic must be between 3 and 120 characters.';
    if (desiredOutcome.trim().length < 10 || desiredOutcome.trim().length > 500) return 'Desired outcome must be between 10 and 500 characters.';
    if (notes.length > 1000) return 'Notes cannot exceed 1,000 characters.';
    return '';
  }, [desiredOutcome, notes, topic]);

  const validationError = scheduleValidationError || detailsValidationError;
  const hasEnoughCredits = (availability?.quotaStatus.totalCreditsAvailable ?? 0) >= 10;

  const chooseBookingPath = (path: BookingPath) => {
    setBookingPath(path);
    setStep('schedule');
    setError('');
  };

  const moveCalendarWeek = (direction: -1 | 1) => {
    const nextWeek = addDaysToKey(visibleWeekStart, direction * 7);
    const firstAvailableInWeek = Array.from({ length: 7 }, (_, index) => addDaysToKey(nextWeek, index))
      .find((date) => instantSlotsByDayMap.has(date));
    setCalendarWeekStart(nextWeek);
    setSelectedCalendarDay(firstAvailableInWeek ?? nextWeek);
    setSelectedInstantSlot('');
  };

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
        notes: notes.trim() || undefined,
        timezone,
      };
      const response = bookingPath === 'instant'
        ? await createInstantDiscoveryCallBooking({ ...common, startsAt: selectedInstantSlot })
        : await createDiscoveryCallRequest({
          ...common,
          slots: slots.map((slot) => ({ startsAt: wallTimeToUtc(proposedWallTime(slot), timezone)! })),
        });
      if (!response.success) throw new Error(response.error || 'Unable to reserve the Discovery Call.');
      trackDiscoveryCallWorkflow('discovery_call_request_submitted', {
        discovery_call_id: response.callId,
        mentor_id: id,
        status: bookingPath === 'instant' ? 'pending_meeting_creation' : 'pending_mentor_response',
        source: 'mentor_marketplace',
        booking_mode: bookingPath,
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
  const selectedTimeLabel = selectedInstantSlot
    ? new Intl.DateTimeFormat(undefined, {
      dateStyle: 'full',
      timeStyle: 'short',
      timeZone: displayTimezone,
    }).format(new Date(selectedInstantSlot))
    : '';

  return <>
    <Helmet><title>Book a Discovery Call | Creatives Takeover</title><meta name="robots" content="noindex,nofollow" /></Helmet>
    <Navigation />
    <main className="container mx-auto min-h-screen max-w-5xl px-4 pb-16 pt-header-offset">
      <Button variant="ghost" asChild className="mb-4">
        <Link to={id ? `/mentorship/mentors/${id}` : '/mentorship'}><ArrowLeft className="mr-2 h-4 w-4" />Back to mentor</Link>
      </Button>

      {loading ? <Card><CardContent className="flex items-center justify-center p-12"><Loader2 className="mr-2 h-5 w-5 animate-spin" />Loading available times...</CardContent></Card> :
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/20">
            <div className="flex items-center gap-4">
              <Avatar className="h-14 w-14 border">
                <AvatarImage src={mentor?.picture} alt={mentor?.name || 'Mentor'} />
                <AvatarFallback>{mentorInitials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl"><CalendarClock className="h-5 w-5" />Book a Discovery Call</CardTitle>
                <CardDescription className="mt-1">30 minutes with {mentor?.name}</CardDescription>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="border-b px-5 py-4 sm:px-8">
              <div className="mx-auto flex max-w-xl items-center" aria-label="Booking progress">
                <div className={cn('flex items-center gap-2 text-sm font-semibold', step === 'schedule' ? 'text-primary' : 'text-foreground')}>
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-full border', step === 'details' ? 'border-primary bg-primary text-primary-foreground' : 'border-primary')}>{step === 'details' ? <Check className="h-4 w-4" /> : '1'}</span>
                  Select a time
                </div>
                <div className="mx-3 h-px flex-1 bg-border" />
                <div className={cn('flex items-center gap-2 text-sm font-semibold', step === 'details' ? 'text-primary' : 'text-muted-foreground')}>
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-full border', step === 'details' ? 'border-primary' : 'border-border')}>2</span>
                  Call details
                </div>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              {!availability?.featureEnabled && <Alert className="mb-5"><AlertDescription>Discovery Calls are not enabled yet.</AlertDescription></Alert>}
              {availability?.featureEnabled && !availability.available && <Alert className="mb-5"><AlertDescription>This mentor is not accepting Discovery Calls. You can still send them a message.</AlertDescription></Alert>}
              {availability?.featureEnabled && availability.available && !hasEnoughCredits && <Alert variant="destructive" className="mb-5"><AlertDescription>You need 10 available credits. <Link className="font-semibold underline" to="/pricing#credit-packs">Buy credits</Link> or <Link className="font-semibold underline" to="/pricing">compare plans</Link>.</AlertDescription></Alert>}
              {error && <Alert variant="destructive" className="mb-5"><AlertDescription>{error}</AlertDescription></Alert>}

              {step === 'schedule' ? <div className="mx-auto max-w-3xl">
                <div className="mb-6 text-center">
                  <h2 className="text-xl font-semibold">Select a date and time</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Times are shown in your timezone. Your slot is held while the private Google Meet link is created.</p>
                </div>

                <div className="mb-6 rounded-xl border bg-card p-4 sm:p-5">
                  <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <p className="font-semibold">{formatCalendarDate(visibleWeekStart, { month: 'short', day: 'numeric' })} - {formatCalendarDate(addDaysToKey(visibleWeekStart, 6), { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      <p className="text-xs text-muted-foreground">30-minute Discovery Call</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" size="icon" variant="outline" aria-label="Previous week" disabled={visibleWeekStart <= firstCalendarWeek} onClick={() => moveCalendarWeek(-1)}><ChevronLeft className="h-4 w-4" /></Button>
                      <Button type="button" size="icon" variant="outline" aria-label="Next week" disabled={visibleWeekStart >= lastCalendarWeek} onClick={() => moveCalendarWeek(1)}><ChevronRight className="h-4 w-4" /></Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {visibleWeekDays.map((date) => {
                      const available = instantSlotsByDayMap.has(date);
                      const selected = selectedCalendarDay === date;
                      return <button
                        key={date}
                        type="button"
                        disabled={!available}
                        aria-pressed={selected}
                        onClick={() => { setSelectedCalendarDay(date); setSelectedInstantSlot(''); }}
                        className={cn(
                          'flex min-h-16 flex-col items-center justify-center rounded-lg border px-1 py-2 text-center transition-colors sm:min-h-20',
                          available ? 'hover:border-primary hover:bg-primary/5' : 'cursor-not-allowed border-transparent text-muted-foreground/45',
                          selected && available && 'border-primary bg-primary text-primary-foreground hover:bg-primary',
                        )}
                      >
                        <span className="text-xs font-semibold uppercase">{formatCalendarDate(date, { weekday: 'short' })}</span>
                        <span className="mt-1 text-base font-bold sm:text-lg">{formatCalendarDate(date, { day: 'numeric' })}</span>
                        <span className="sr-only">{available ? 'Available' : 'Unavailable'}</span>
                      </button>;
                    })}
                  </div>

                  <div className="mt-5 border-t pt-5">
                    {selectedDaySlots.length ? <>
                      <div className="mb-3 flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4" />{formatCalendarDate(selectedCalendarDay, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                        {selectedDaySlots.map((slot) => <Button
                          key={slot.startsAt}
                          type="button"
                          variant={selectedInstantSlot === slot.startsAt ? 'default' : 'outline'}
                          aria-pressed={selectedInstantSlot === slot.startsAt}
                          onClick={() => setSelectedInstantSlot(slot.startsAt)}
                        >
                          {new Intl.DateTimeFormat(undefined, { timeStyle: 'short', timeZone: displayTimezone }).format(new Date(slot.startsAt))}
                        </Button>)}
                      </div>
                    </> : <div className="py-3 text-center text-sm text-muted-foreground">
                      {instantSlotsByDay.length ? 'No published times are available in this week. Use the arrows to check another week.' : 'This mentor has not published instant-booking times yet.'}
                    </div>}
                  </div>
                </div>

                <div className="mb-5">
                  <Label htmlFor="timezone">Your timezone</Label>
                  <Select value={timezone} onValueChange={(value) => { setTimezone(value); setSelectedInstantSlot(''); }}>
                    <SelectTrigger id="timezone" className="mt-1" aria-label="Your timezone">
                      <SelectValue placeholder="Choose your timezone" />
                    </SelectTrigger>
                    <SelectContent position="item-aligned" className="max-h-80">
                      {timezoneOptions.map((option) => <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>)}
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">Scroll to choose from the same timezone catalog used by the mentor marketplace. Times update automatically and confirmations include UTC.</p>
                </div>

                <div className="mb-5 flex items-start gap-3 rounded-xl border bg-primary/5 p-4">
                  <Globe2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">{mentor?.name || 'Mentor'}'s timezone</p>
                    <p className="text-sm text-foreground">
                      {[mentorCountry, mentorDisplayTimezone, mentorTimezoneLabel].filter(Boolean).join(' · ')}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Every option is converted to this timezone for the mentor before the email is sent.</p>
                  </div>
                </div>

                {bookingPath === 'request' && <div className="mb-6 rounded-xl border bg-muted/20 p-4 sm:p-5">
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div><h3 className="font-semibold">Propose three times</h3><p className="text-sm text-muted-foreground">The mentor can accept one option, counter, or decline within 72 hours.</p></div>
                    {instantSlotsByDay.length > 0 && <Button type="button" variant="ghost" size="sm" onClick={() => chooseBookingPath('instant')}>Back to calendar</Button>}
                  </div>
                  <div className="space-y-3">
                    {slots.map((slot, index) => {
                      const founderPreview = formatProposedSlot(slot, displayTimezone, displayTimezone);
                      const mentorPreview = formatProposedSlot(slot, displayTimezone, mentorDisplayTimezone);
                      return <div key={index} className="rounded-lg border bg-background p-3">
                        <p className="mb-3 text-sm font-semibold">Option {index + 1}</p>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <Label htmlFor={`slot-date-${index}`} className="flex items-center gap-2"><CalendarDays className="h-4 w-4" />Date</Label>
                            <Input
                              id={`slot-date-${index}`}
                              className="mt-1"
                              type="date"
                              value={slot.date}
                              min={dayKey(new Date(Date.now() + 72 * 60 * 60_000).toISOString(), displayTimezone)}
                              max={dayKey(new Date(Date.now() + 60 * 24 * 60 * 60_000).toISOString(), displayTimezone)}
                              onChange={(event) => setSlots((current) => current.map((value, slotIndex) => slotIndex === index ? { ...value, date: event.target.value } : value))}
                            />
                          </div>
                          <div>
                            <Label htmlFor={`slot-time-${index}`} className="flex items-center gap-2"><Clock3 className="h-4 w-4" />Time</Label>
                            <Input
                              id={`slot-time-${index}`}
                              className="mt-1"
                              type="time"
                              step={900}
                              value={slot.time}
                              onChange={(event) => setSlots((current) => current.map((value, slotIndex) => slotIndex === index ? { ...value, time: event.target.value } : value))}
                            />
                          </div>
                        </div>
                        {founderPreview && <div className="mt-3 space-y-1 text-xs">
                          <p><span className="font-semibold">Your time:</span> {founderPreview} ({formatTimezoneLabel(getCurrentTimezoneOffset(displayTimezone) ?? 0)})</p>
                          <p className="text-muted-foreground"><span className="font-semibold text-foreground">Mentor time:</span> {mentorPreview} ({mentorTimezoneLabel})</p>
                        </div>}
                      </div>;
                    })}
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Choose an exact date and time for each option. Every option must be 72 hours to 60 days away.</p>
                </div>}

                {bookingPath === 'instant' && canRequestFallback && <div className="mb-6 text-center">
                  <p className="text-sm text-muted-foreground">No suitable time?</p>
                  <Button type="button" variant="link" className="h-auto px-2" onClick={() => chooseBookingPath('request')}>Propose three times instead</Button>
                </div>}

                <Button className="w-full" type="button" disabled={!availability?.available || !hasEnoughCredits || Boolean(scheduleValidationError)} onClick={continueToDetails}>
                  Continue to call details
                </Button>
                {scheduleValidationError && <p className="mt-2 text-center text-sm text-muted-foreground">{scheduleValidationError}</p>}
              </div> :
                <form className="mx-auto max-w-2xl space-y-5" onSubmit={submit}>
                  <div className="rounded-xl border bg-muted/20 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your selection</p>
                        <p className="mt-1 font-semibold">{bookingPath === 'instant' ? selectedTimeLabel : 'Three times proposed for mentor review'}</p>
                        <p className="mt-1 text-sm text-muted-foreground">30 minutes · {timezone}</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => { setStep('schedule'); setError(''); }}>Change</Button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="topic">What would you like help with?</Label>
                    <Input id="topic" className="mt-1" value={topic} onChange={(event) => setTopic(event.target.value)} maxLength={120} placeholder="Fundraising strategy" autoFocus />
                    <p className="mt-1 text-xs text-muted-foreground">A short topic helps the mentor prepare.</p>
                  </div>
                  <div>
                    <Label htmlFor="outcome">What outcome do you want from the call?</Label>
                    <Textarea id="outcome" className="mt-1 min-h-28" value={desiredOutcome} onChange={(event) => setDesiredOutcome(event.target.value)} maxLength={500} placeholder="What decision or next step should this call help you reach?" />
                  </div>
                  <details className="rounded-lg border p-4">
                    <summary className="cursor-pointer text-sm font-semibold">Add optional notes</summary>
                    <div className="mt-3"><Label htmlFor="notes" className="sr-only">Optional notes</Label><Textarea id="notes" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={1000} placeholder="Links, context, or questions for the mentor" /></div>
                  </details>

                  <Alert><Coins className="h-4 w-4" /><AlertDescription>10 credits are held when you confirm. They are charged only after the confirmed time and private Google Meet link both exist.</AlertDescription></Alert>
                  <div className="rounded-lg border p-4 text-sm">
                    <div className="flex items-center gap-2 font-medium"><Video className="h-4 w-4" />What happens next</div>
                    <p className="mt-2 text-muted-foreground">{bookingPath === 'instant' ? 'We reserve the selected time, create a private Google Meet, and notify you, the mentor, and Creatives Takeover.' : 'The mentor receives your three options. Credits remain held until a time and private Google Meet are confirmed.'}</p>
                  </div>

                  <div className="flex flex-col-reverse gap-3 sm:flex-row">
                    <Button type="button" variant="outline" className="sm:w-1/3" onClick={() => { setStep('schedule'); setError(''); }}>Back</Button>
                    <Button className="sm:flex-1" type="submit" disabled={submitting || !availability?.available || !hasEnoughCredits || Boolean(validationError)}>
                      {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {bookingPath === 'instant' ? 'Confirm Discovery Call · 10 credits' : 'Send request · 10 credits'}
                    </Button>
                  </div>
                  {detailsValidationError && <p className="text-center text-sm text-muted-foreground">{detailsValidationError}</p>}
                </form>}
            </div>
          </CardContent>
        </Card>}
    </main>
    <Footer />
  </>;
}
