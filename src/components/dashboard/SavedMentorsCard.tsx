import { Link } from 'react-router-dom';
import { ArrowRight, BookmarkCheck, Loader2, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { SavedMentor, useMentorSaves } from '@/hooks/useMentorSaves';
import { trackRetentionEvent } from '@/lib/retentionSystem';

const SAVED_MENTORS_URL = '/saved-mentors';
const MAX_VISIBLE_MENTORS = 3;

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
  if (item.source === 'onboarding_recommendation') {
    return 'Recommended for you';
  }

  return formatSavedDate(item.created_at);
}

export function SavedMentorsCard() {
  const { user } = useAuth();
  const { savedMentors, loading, pendingMentorId, removeSavedMentor } = useMentorSaves();

  const visibleSavedMentors = savedMentors.filter(isVisibleSavedMentor);
  const savedMentorCount = visibleSavedMentors.length;
  const featuredMentors = visibleSavedMentors.slice(0, MAX_VISIBLE_MENTORS);

  const trackWidgetEvent = (action: string, mentorId?: string) => {
    if (!user?.id) {
      return;
    }

    void trackRetentionEvent('dashboard_saved_mentor_clicked', {
      user_id: user.id,
      action,
      mentor_id: mentorId,
      saved_mentor_count: savedMentorCount,
      location: 'saved_mentors_widget',
    });
  };

  const handleRemove = async (mentorId: string) => {
    trackWidgetEvent('remove', mentorId);
    await removeSavedMentor(mentorId);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card via-card to-primary/10 shadow-sm">
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <BookmarkCheck className="h-3.5 w-3.5" />
              Saved mentors
            </div>
            <div>
              <CardTitle className="text-xl">Your mentor shortlist lives here</CardTitle>
              <CardDescription className="mt-1 max-w-2xl">
                Every mentor you save is stored in the dashboard so you can pick the relationship back up without digging through the marketplace again.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {savedMentorCount} saved
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link to={SAVED_MENTORS_URL} onClick={() => trackWidgetEvent('see_all')}>
                See all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="grid gap-3 lg:grid-cols-3">
            {Array.from({ length: MAX_VISIBLE_MENTORS }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-border/60 bg-background/70 p-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="mb-3 h-10 animate-pulse rounded bg-muted" />
                <div className="h-9 w-28 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : savedMentorCount === 0 ? (
          <div className="rounded-2xl border border-dashed border-primary/25 bg-background/70 p-6 text-sm text-muted-foreground">
            <p className="text-base font-semibold text-foreground">No saved mentors yet</p>
            <p className="mt-2 max-w-2xl leading-6">
              When you save a mentor in the community marketplace, they will appear here for quick follow-up from your dashboard.
            </p>
            <Button asChild className="mt-4">
              <Link to="/mentorship" onClick={() => trackWidgetEvent('browse_empty_state')}>
                Browse mentors
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-3">
            {featuredMentors.map((item) => {
              const expertise = item.mentor.expertise ?? [];
              const hiddenExpertiseCount = Math.max(expertise.length - 2, 0);

              return (
                <div key={item.id} className="rounded-2xl border border-border/60 bg-background/75 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-12 w-12 border border-border/60">
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

                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{item.mentor.name}</p>
                        <p className="text-xs text-muted-foreground">{getSavedMentorLabel(item)}</p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
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

                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.source === 'onboarding_recommendation' ? (
                      <Badge variant="secondary">Recommended for you</Badge>
                    ) : null}
                    {expertise.slice(0, 2).map((tag) => (
                      <Badge key={tag} variant="outline" className="max-w-full truncate">
                        {tag}
                      </Badge>
                    ))}
                    {hiddenExpertiseCount > 0 ? (
                      <Badge variant="secondary">+{hiddenExpertiseCount} more</Badge>
                    ) : null}
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button asChild size="sm">
                      <Link
                        to={`/mentorship/mentors/${item.mentor.id}`}
                        onClick={() => trackWidgetEvent('open_profile', item.mentor.id)}
                      >
                        View profile
                      </Link>
                    </Button>
                    <Button asChild size="sm" variant="outline">
                      <Link to={SAVED_MENTORS_URL} onClick={() => trackWidgetEvent('open_saved_list', item.mentor.id)}>
                        Continue in community
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
