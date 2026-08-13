import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, Loader2, ShieldAlert, X } from "lucide-react";
import {
  loadYouTubeIframeApi,
  youtubeThumbnail,
  youtubeWatchUrl,
  type YouTubeIframePlayer,
} from "@/lib/podcast";
import { cn } from "@/lib/utils";

interface PodcastPlayerModalProps {
  videoId: string;
  title: string;
  onClose: () => void;
}

/**
 * Semi full-screen in-platform YouTube player. The video plays inside an overlay
 * (16:9 frame, centered) with an "X" close button in the corner. Closes on the X,
 * a backdrop click, or the Escape key.
 */
const PodcastPlayerModal = ({ videoId, title, onClose }: PodcastPlayerModalProps) => {
  const playerHostRef = useRef<HTMLDivElement>(null);
  const [playerStatus, setPlayerStatus] = useState<"loading" | "ready" | "blocked" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    let player: YouTubeIframePlayer | null = null;
    setPlayerStatus("loading");
    const loadTimeout = window.setTimeout(() => {
      if (!cancelled) setPlayerStatus("error");
    }, 15_000);

    void loadYouTubeIframeApi()
      .then((api) => {
        if (cancelled || !playerHostRef.current) return;
        player = new api.Player(playerHostRef.current, {
          videoId,
          playerVars: {
            autoplay: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (cancelled) return;
              window.clearTimeout(loadTimeout);
              setPlayerStatus("ready");
              event.target.playVideo();
            },
            onStateChange: (event) => {
              if (
                !cancelled &&
                [api.PlayerState.BUFFERING, api.PlayerState.PLAYING, api.PlayerState.CUED].includes(event.data)
              ) {
                window.clearTimeout(loadTimeout);
                setPlayerStatus("ready");
              }
            },
            onError: (event) => {
              if (cancelled) return;
              window.clearTimeout(loadTimeout);
              setPlayerStatus(event.data === 101 || event.data === 150 ? "blocked" : "error");
            },
          },
        });
      })
      .catch(() => {
        if (!cancelled) setPlayerStatus("error");
      });

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeout);
      player?.destroy();
    };
  }, [videoId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // Lock background scroll while the player is open.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close player"
          className="absolute -top-12 right-0 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white transition-colors hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:-top-2 sm:-right-12"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          {/* Poster + spinner until the player finishes loading, so the modal feels
              instant instead of showing a black frame while YouTube initializes. */}
          {playerStatus === "loading" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <img
                src={youtubeThumbnail(videoId)}
                alt=""
                aria-hidden
                width={480}
                height={360}
                loading="eager"
                decoding="async"
                className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 blur-sm"
              />
              <Loader2 className="relative h-9 w-9 animate-spin text-white/90" />
            </div>
          )}
          {/* Keep visibility on a React-owned wrapper. YouTube replaces the host
              element with its iframe, so state-driven classes on the host itself
              can remain stuck on the generated iframe (audio plays, video hidden). */}
          <div
            className={cn(
              "h-full w-full transition-opacity duration-300 [&_iframe]:h-full [&_iframe]:w-full",
              playerStatus === "ready" ? "opacity-100" : "opacity-0",
              (playerStatus === "blocked" || playerStatus === "error") && "invisible"
            )}
          >
            <div ref={playerHostRef} className="h-full w-full" />
          </div>
          {(playerStatus === "blocked" || playerStatus === "error") && (
            <div className="absolute inset-0 z-20 flex items-center justify-center p-6 text-center">
              <img
                src={youtubeThumbnail(videoId)}
                alt=""
                aria-hidden
                width={480}
                height={360}
                className="absolute inset-0 h-full w-full object-cover opacity-20 blur-sm"
              />
              <div className="relative max-w-lg rounded-2xl border border-white/15 bg-black/75 p-6 shadow-2xl">
                <ShieldAlert className="mx-auto h-9 w-9 text-warning" aria-hidden />
                <h2 className="mt-3 text-xl font-semibold text-white">
                  {playerStatus === "blocked" ? "YouTube blocked embedded playback" : "The player could not start"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-white/75">
                  {playerStatus === "blocked"
                    ? "YouTube is currently classifying this upload as restricted, so it can only play on YouTube."
                    : "Open the episode on YouTube to keep watching."}
                </p>
                <a
                  href={youtubeWatchUrl(videoId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-destructive px-5 py-2 text-sm font-semibold text-destructive-foreground transition-colors hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  Watch on YouTube <ExternalLink className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </div>
          )}
        </div>

        <p className="mt-3 line-clamp-1 text-center text-sm font-medium text-white/80">{title}</p>
      </div>
    </div>,
    document.body
  );
};

export default PodcastPlayerModal;
