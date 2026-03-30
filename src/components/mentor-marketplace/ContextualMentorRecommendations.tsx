import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MentorCard } from '@/components/mentor-marketplace/MentorCard';
import { useMentorRecommendations } from '@/hooks/useMentorRecommendations';
import {
  buildMentorMarketplaceRoute,
  getMentorRecommendationBrowseLabel,
  getMentorRecommendationDescription,
  getMentorRecommendationTitle,
  type MentorRecommendationTrack,
} from '@/lib/mentorDemand';

interface ContextualMentorRecommendationsProps {
  track: MentorRecommendationTrack;
  source: string;
  title?: string;
  description?: string;
  targetAudience?: string | null;
  summaryInsight?: string | null;
  extraKeywords?: string[];
}

export function ContextualMentorRecommendations({
  track,
  source,
  title,
  description,
  targetAudience,
  summaryInsight,
  extraKeywords,
}: ContextualMentorRecommendationsProps) {
  const { loading, recommendations } = useMentorRecommendations(
    {
      track,
      targetAudience,
      summaryInsight,
      extraKeywords,
    },
    {
      limit: 2,
      source,
    },
  );

  const browseRoute = buildMentorMarketplaceRoute({ track, source });

  if (!loading && recommendations.length === 0) {
    return null;
  }

  return (
    <section className="space-y-5 rounded-3xl border border-border/60 bg-background/80 p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">Mentor Match</p>
          <h3 className="text-2xl font-semibold leading-tight">
            {title ?? getMentorRecommendationTitle(track)}
          </h3>
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
            {description ?? getMentorRecommendationDescription(track)}
          </p>
        </div>

        <Button asChild variant="outline" className="shrink-0">
          <Link to={browseRoute}>{getMentorRecommendationBrowseLabel(track)}</Link>
        </Button>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
          Finding the best mentors for this moment…
        </div>
      ) : (
        <div className="space-y-5">
          {recommendations.map(({ mentor, reason, matchedExpertise }, index) => (
            <div key={mentor.id} className="space-y-3">
              <div className="rounded-2xl border border-primary/10 bg-primary/5 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/70">
                  Recommended Match {index + 1}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/85">{reason}</p>
                {matchedExpertise.length > 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Best-fit expertise: {matchedExpertise.join(', ')}
                  </p>
                ) : null}
              </div>
              <MentorCard mentor={mentor} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
