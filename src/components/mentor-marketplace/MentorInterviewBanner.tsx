import { useState } from "react";
import { Play } from "lucide-react";
import PodcastPlayerModal from "@/components/podcast/PodcastPlayerModal";
import { warmYouTubeEmbed, youtubeThumbnail } from "@/lib/podcast";
import type { MentorPodcastEpisode } from "@/hooks/useMentorPodcastEpisode";

interface MentorInterviewBannerProps {
  episode: MentorPodcastEpisode;
  mentorName: string;
}

/**
 * Podcast interview banner on a mentor profile, sitting between the profile
 * header and the About section.
 *
 * Clicking opens the same PodcastPlayerModal the /podcast page uses, so the
 * video plays in place instead of sending the visitor off to the podcast page.
 */
const MentorInterviewBanner = ({ episode, mentorName }: MentorInterviewBannerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [thumbError, setThumbError] = useState(false);
  const warmPlayer = () => warmYouTubeEmbed(episode.youtubeVideoId);

  return (
    <div className="border-t border-border/50">
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Watch the interview</h2>

        <button
          type="button"
          onClick={() => setIsPlaying(true)}
          onPointerEnter={warmPlayer}
          onFocus={warmPlayer}
          onTouchStart={warmPlayer}
          aria-label={`Play ${episode.title}`}
          className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/70 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row"
        >
          <span className="relative block w-full shrink-0 overflow-hidden bg-muted sm:w-64 lg:w-72">
            <span className="block aspect-video w-full">
              {!thumbError ? (
                <img
                  src={youtubeThumbnail(episode.youtubeVideoId)}
                  alt=""
                  width={480}
                  height={360}
                  loading="lazy"
                  decoding="async"
                  onError={() => setThumbError(true)}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20" />
              )}
            </span>
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors duration-300 group-hover:bg-black/40">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform duration-300 group-hover:scale-110">
                <Play className="ml-0.5 h-6 w-6 fill-current" />
              </span>
            </span>
          </span>

          <span className="flex min-w-0 flex-1 flex-col justify-center gap-2 p-5">
            <span className="text-label font-semibold uppercase tracking-wider text-primary">
              Founders Unleashed
            </span>
            <span className="text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary">
              {episode.title}
            </span>
            {episode.description && (
              <span className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                {episode.description}
              </span>
            )}
          </span>
        </button>
      </div>

      {isPlaying && (
        <PodcastPlayerModal
          videoId={episode.youtubeVideoId}
          title={episode.title || `${mentorName} interview`}
          onClose={() => setIsPlaying(false)}
        />
      )}
    </div>
  );
};

export default MentorInterviewBanner;
