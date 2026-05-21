import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookmarkCheck, Compass, Loader2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { SavedMentor, useMentorSaves } from '@/hooks/useMentorSaves';
import { trackRetentionEvent } from '@/lib/retentionSystem';

const SAVED_MARKETPLACE_URL = '/mentorship?mentorSource=saved';

type VisibleSavedMentor = SavedMentor & {
  mentor: NonNullable<SavedMentor['mentor']>;
};

function isVisibleSavedMentor(item: SavedMentor): item is VisibleSavedMentor {
  return item.mentor !== null;
}

function formatSavedDate(createdAt: string) {
  const parsedDate = new Date(createdAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return 'Saved recently';
  }

  return `Saved ${parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })}`;
}

function getSavedMentorLabel(item: SavedMentor) {
  return item.source === 'onboarding_recommendation'
    ? 'Recommended for you'
    : formatSavedDate(item.created_at);
}

const SavedMentorsPage = () => {
  const { user } = useAuth();
  const { savedMentors, loading, pendingMentorId, removeSavedMentor } = useMentorSaves();
  const visibleSavedMentors = savedMentors.filter(isVisibleSavedMentor);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    void trackRetentionEvent('saved_mentors_page_viewed', {
      user_id: user.id,
      saved_mentor_count: visibleSavedMentors.length,
      location: 'saved_mentors_page',
    });
  }, [user?.id, visibleSavedMentors.length]);

  const trackPageAction = (action: string, mentorId?: string) => {
    if (!user?.id) {
      return;
    }

    void trackRetentionEvent('saved_mentors_page_clicked', {
      user_id: user.id,
      action,
      mentor_id: mentorId,
      saved_mentor_count: visibleSavedMentors.length,
      location: 'saved_mentors_page',
    });
  };

  const handleRemove = async (mentorId: string) => {
    trackPageAction('remove', mentorId);
    await removeSavedMentor(mentorId);
  };

  return (
    <DashboardLayout
      title="Saved Mentors"
      subtitle="Your mentor follow-up queue lives here, outside the War Room."
    >
      <div className="space-y-6">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-card to-card shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-2">
                <Badge variant="outline" className="w-fit">Sidebar subtab</Badge>
                <CardTitle className="text-2xl">Keep mentor follow-up out of the War Room</CardTitle>
                <CardDescription className="max-w-3xl text-sm sm:text-base">
                  Saved Mentors now lives in its own dashboard lane so the War Room can stay focused on execution while mentor follow-up has enough room to breathe.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{visibleSavedMentors.length} saved</Badge>
                <Button asChild variant="outline" size="sm">
                  <Link to={SAVED_MARKETPLACE_URL} onClick={() => trackPageAction('open_saved_marketplace')}>
                    Open saved feed
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Queue size</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{visibleSavedMentors.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">A short mentor queue is easier to act on than a crowded War Room widget.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Best use</p>
              <p className="mt-2 text-lg font-semibold text-foreground">Move one relationship forward</p>
              <p className="mt-2 text-sm text-muted-foreground">Use this page to pick a single mentor and take the next step today.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Community path</p>
              <p className="mt-2 text-lg font-semibold text-foreground">Saved marketplace view</p>
              <p className="mt-2 text-sm text-muted-foreground">When you need broader context, jump back into the saved mentors marketplace view.</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.18fr_0.82fr]">
          <div className="space-y-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <Card key={index} className="border-border/70 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-14 w-14 animate-pulse rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                        <div className="h-3 w-1/4 animate-pulse rounded bg-muted" />
                      </div>
                    </div>
                    <div className="mt-4 h-12 animate-pulse rounded bg-muted" />
                  </CardContent>
                </Card>
              ))
            ) : visibleSavedMentors.length === 0 ? (
              <Card className="border-primary/20 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <BookmarkCheck className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-xl font-semibold text-foreground">No saved mentors yet</h2>
                  <p className="mx-auto mt-2 max-w-2xl text-sm text-muted-foreground">
                    Save mentors from Community and they will appear here, away from the War Room, as a focused follow-up queue.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                    <Button asChild>
                      <Link to="/mentorship" onClick={() => trackPageAction('browse_mentors')}>
                        Browse mentors
                        <ArrowRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/dashboard">Back to War Room</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              visibleSavedMentors.map((item) => {
                const expertise = item.mentor.expertise ?? [];

                return (
                  <Card key={item.id} className="border-border/70 bg-card/80 backdrop-blur-sm">
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div className="flex items-start gap-4 min-w-0">
                          <Avatar className="h-14 w-14 border border-border/60">
                            <AvatarImage src={item.mentor.picture ?? undefined} alt={item.mentor.name} className="object-cover" />
                            <AvatarFallback>
                              {item.mentor.name
                                .split(' ')
                                .map((part) => part[0])
                                .join('')
                                .slice(0, 2)
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-lg font-semibold text-foreground">{item.mentor.name}</p>
                              <Badge variant="outline">{getSavedMentorLabel(item)}</Badge>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Keep this mentor in your side lane until you are ready to message, book, or revisit them inside Community.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {expertise.slice(0, 3).map((tag) => (
                                <Badge key={tag} variant="secondary">{tag}</Badge>
                              ))}
                              {expertise.length === 0 ? <Badge variant="secondary">General mentor</Badge> : null}
                            </div>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() => void handleRemove(item.mentor_id)}
                          disabled={pendingMentorId === item.mentor_id}
                          aria-label={`Remove ${item.mentor.name} from saved mentors`}
                        >
                          {pendingMentorId === item.mentor_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <X className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <Button asChild size="sm">
                          <Link to={`/mentorship/mentors/${item.mentor.id}`} onClick={() => trackPageAction('open_profile', item.mentor.id)}>
                            View profile
                          </Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link to={SAVED_MARKETPLACE_URL} onClick={() => trackPageAction('open_saved_marketplace_item', item.mentor.id)}>
                            Continue in Community
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>

          <div className="space-y-6">
            <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Compass className="h-5 w-5 text-primary" />
                  How to use this lane
                </CardTitle>
                <CardDescription>Keep mentor follow-up deliberate instead of letting it compete with execution inside the War Room.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                  Pick one mentor worth advancing this week instead of reopening the whole list every day.
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                  Use the War Room for execution, then come here when you are ready for mentor follow-up.
                </div>
                <div className="rounded-xl border border-border/60 bg-background/70 p-4">
                  If you need more context before acting, open the saved Community view and compare the shortlist there.
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/70 bg-card/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Quick routes</CardTitle>
                <CardDescription>Keep follow-up, messages, and bookings in separate spaces instead of stacking them into the dashboard home.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full justify-between">
                  <Link to={SAVED_MARKETPLACE_URL} onClick={() => trackPageAction('open_saved_marketplace_cta')}>
                    Open saved mentors in Community
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link to="/messages" onClick={() => trackPageAction('open_messages')}>
                    Open Messages
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-between">
                  <Link to="/mentorship/my-bookings" onClick={() => trackPageAction('open_bookings')}>
                    View bookings
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SavedMentorsPage;
