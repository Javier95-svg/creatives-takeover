import { useState } from "react";
import { Play, Pencil, Trash2, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { youtubeThumbnail } from "@/lib/podcast";
import type { PodcastEpisode } from "@/hooks/usePodcastEpisodes";

interface PodcastEpisodeBannerProps {
  episode: PodcastEpisode;
  isAdmin: boolean;
  onPlay: (episode: PodcastEpisode) => void;
  onEdit?: (episode: PodcastEpisode) => void;
  onDelete?: (episode: PodcastEpisode) => void;
}

const PodcastEpisodeBanner = ({
  episode,
  isAdmin,
  onPlay,
  onEdit,
  onDelete,
}: PodcastEpisodeBannerProps) => {
  const [thumbError, setThumbError] = useState(false);

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card/70 shadow-sm backdrop-blur-sm transition-all hover:border-primary/40 hover:shadow-lg sm:flex-row",
        !episode.is_published && "opacity-70"
      )}
    >
      {/* Thumbnail (left) */}
      <button
        type="button"
        onClick={() => onPlay(episode)}
        aria-label={`Play ${episode.title}`}
        className="relative block w-full shrink-0 overflow-hidden bg-muted sm:w-72 lg:w-80"
      >
        <div className="aspect-video w-full">
          {!thumbError ? (
            <img
              src={youtubeThumbnail(episode.youtube_video_id)}
              alt={episode.title}
              loading="lazy"
              onError={() => setThumbError(true)}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20" />
          )}
        </div>
        {/* Play overlay */}
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
            <Play className="ml-0.5 h-6 w-6 fill-current" />
          </span>
        </span>
      </button>

      {/* Details (right) */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h3
            onClick={() => onPlay(episode)}
            className="cursor-pointer text-lg font-semibold leading-snug text-foreground transition-colors hover:text-primary sm:text-xl"
          >
            {episode.title}
            {!episode.is_published && (
              <span className="ml-2 inline-flex items-center gap-1 align-middle text-xs font-medium text-warning">
                <EyeOff className="h-3.5 w-3.5" />
                Draft
              </span>
            )}
          </h3>

          {isAdmin && (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit?.(episode)}
                aria-label="Edit episode"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => onDelete?.(episode)}
                aria-label="Delete episode"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {episode.description && (
          <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
            {episode.description}
          </p>
        )}

        {episode.hashtags.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
            {episode.hashtags.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/15"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </article>
  );
};

export default PodcastEpisodeBanner;
