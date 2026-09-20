import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { CalendarClock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import SEO from '@/components/SEO';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { useAccountContext } from '@/hooks/useAccountContext';
import { listMentorBookings, respondToBooking, type MentorBooking } from '@/services/accountFeatures';

// The same labels the founder side of a booking shows, so both people are
// reading the same word for the same state.
const STATUS_LABELS: Record<string, string> = {
  intent_created: 'Legacy attempt',
  pending_mentor_response: 'Waiting on you',
  pending_founder_response: 'Waiting on the founder',
  pending_meeting_creation: 'Creating secure meeting',
  scheduled: 'Scheduled',
  awaiting_outcome: 'Awaiting outcome',
  completed: 'Completed',
  declined: 'Declined',
  withdrawn: 'Withdrawn',
  expired: 'Expired',
  cancelled_early: 'Cancelled',
  cancelled_late: 'Cancelled late',
  founder_no_show: 'Founder no-show',
  mentor_no_show: 'You did not attend',
};

function when(value: string | null) {
  if (!value) return 'No time agreed yet';
  return new Date(value).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

function BookingRow({ booking, busy, onRespond }: {
  booking: MentorBooking;
  busy: boolean;
  onRespond: (input: { callId: string; decision: 'accept' | 'decline'; slotId?: string; reason?: string }) => void;
}) {
  const [slotId, setSlotId] = useState('');
  const [reason, setReason] = useState('');
  const name = booking.founderName || booking.founderUsername || 'A founder';
  const answerable = booking.status === 'pending_mentor_response' && booking.slots.length > 0;

  return <Card>
    <CardContent className="space-y-4 py-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium">
            {booking.founderUsername
              ? <Link className="underline-offset-4 hover:underline" to={`/profile/${encodeURIComponent(booking.founderUsername)}`}>{name}</Link>
              : name}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{when(booking.scheduledFor)}</p>
        </div>
        <Badge variant={booking.status === 'pending_mentor_response' ? 'default' : 'secondary'}>
          {STATUS_LABELS[booking.status] ?? booking.status}
        </Badge>
      </div>

      {answerable && <div className="space-y-3 border-t border-border/50 pt-4">
        <p className="text-sm font-medium">Pick a time that works</p>
        <div className="flex flex-wrap gap-2">
          {booking.slots.map((slot) => (
            <Button key={slot.id} type="button" size="sm" variant={slotId === slot.id ? 'default' : 'outline'}
              onClick={() => setSlotId(slot.id)}>
              {new Date(slot.startsAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
              <span className="ml-2 text-xs opacity-70">{slot.durationMinutes}m</span>
            </Button>
          ))}
        </div>
        {booking.responseDueAt && <p className="text-xs text-muted-foreground">Answer by {when(booking.responseDueAt)}.</p>}
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" disabled={busy || !slotId}
            onClick={() => onRespond({ callId: booking.id, decision: 'accept', slotId })}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Accept
          </Button>
          <Input value={reason} onChange={(event) => setReason(event.target.value)} maxLength={300}
            placeholder="Optional reason, shared with the founder" className="min-w-0 flex-1" />
          <Button size="sm" variant="outline" disabled={busy}
            onClick={() => onRespond({ callId: booking.id, decision: 'decline', reason: reason || undefined })}>
            Decline
          </Button>
        </div>
      </div>}
    </CardContent>
  </Card>;
}

/**
 * A mentor's own booking inbox.
 *
 * discovery_calls is readable by the founder and by admins, never by the mentor
 * the call is addressed to, so this reads through mentor_bookings(). Answering
 * goes through the discovery call service, which proves ownership from the
 * session and then drives the same state machine the emailed links drive, so
 * credits and calendar invitations behave identically either way.
 */
export default function MentorBookings() {
  const { user, loading: authLoading } = useAuth();
  const { userType, hasCategoryAccess } = useAccountContext();
  const queryClient = useQueryClient();

  const bookings = useQuery({
    queryKey: ['mentor-bookings', user?.id],
    enabled: Boolean(user?.id) && userType === 'mentor' && hasCategoryAccess,
    queryFn: listMentorBookings,
  });

  const respond = useMutation({
    mutationFn: respondToBooking,
    onSuccess: (_result, variables) => {
      toast.success(variables.decision === 'accept' ? 'Accepted. The founder has been told.' : 'Declined. The founder has been told.');
      void queryClient.invalidateQueries({ queryKey: ['mentor-bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['account-home-digest'] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not record your answer.'),
  });

  const rows = bookings.data ?? [];
  const pending = rows.filter((row) => row.status === 'pending_mentor_response');

  return <>
    <SEO title="My bookings" description="Discovery call requests addressed to you." url="/mentor/bookings" noindex />
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 pt-header-offset nav-offset-roomy pb-16">
        <header className="mb-8">
          <h1 className="flex items-center gap-2 text-headline-lg font-semibold"><CalendarClock className="h-6 w-6 text-primary" />My bookings</h1>
          <p className="mt-2 text-body text-muted-foreground">Discovery call requests founders have sent you. Answer here or from the link in your email.</p>
        </header>

        {!authLoading && userType !== 'mentor' && <p className="text-sm text-muted-foreground">This page is for mentor accounts.</p>}
        {userType === 'mentor' && !hasCategoryAccess && <p className="text-sm text-muted-foreground">Your mentor request is still under review. Bookings open once it is approved.</p>}
        {bookings.isPending && bookings.fetchStatus !== 'idle' && <p className="text-sm text-muted-foreground">Loading your bookings…</p>}
        {bookings.isError && <p role="alert" className="text-sm text-destructive">
          Could not load your bookings. <button className="underline" onClick={() => void bookings.refetch()}>Retry</button>
        </p>}
        {bookings.isSuccess && rows.length === 0 && <p className="text-sm text-muted-foreground">No requests yet.</p>}

        {pending.length > 0 && <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">Waiting on you</h2>
          <div className="space-y-3">
            {pending.map((row) => <BookingRow key={row.id} booking={row} busy={respond.isPending} onRespond={respond.mutate} />)}
          </div>
        </section>}

        {rows.length > 0 && <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">All requests</h2>
          <div className="space-y-3">
            {rows.map((row) => <BookingRow key={row.id} booking={row} busy={respond.isPending} onRespond={respond.mutate} />)}
          </div>
        </section>}
      </main>
      <Footer />
    </div>
  </>;
}
