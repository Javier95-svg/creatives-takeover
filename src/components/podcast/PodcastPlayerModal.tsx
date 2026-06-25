import { useEffect, useState, type IframeHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { Loader2, X } from "lucide-react";
import { youtubeEmbedUrl, youtubeThumbnail } from "@/lib/podcast";
import { cn } from "@/lib/utils";

// The site is cross-origin isolated (COEP: credentialless, set in vercel.json for the
// MVP Builder's webcontainers). Under that policy a plain cross-origin iframe is blocked,
// so load the YouTube player as an anonymous/credentialless frame — it satisfies COEP
// without YouTube needing to send its own COEP header. (Ignored by browsers that don't
// support it, which also don't enforce the policy, so the plain embed still works there.)
const credentiallessIframeProp = {
  credentialless: "",
} as unknown as IframeHTMLAttributes<HTMLIFrameElement>;

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
  const [loaded, setLoaded] = useState(false);

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 sm:p-8 backdrop-blur-sm animate-in fade-in duration-200"
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
          {!loaded && (
            <div className="absolute inset-0 z-10 flex items-center justify-center">
              <img
                src={youtubeThumbnail(videoId)}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full scale-105 object-cover opacity-40 blur-sm"
              />
              <Loader2 className="relative h-9 w-9 animate-spin text-white/90" />
            </div>
          )}
          <iframe
            {...credentiallessIframeProp}
            src={youtubeEmbedUrl(videoId, true)}
            title={title}
            onLoad={() => setLoaded(true)}
            className={cn(
              "h-full w-full transition-opacity duration-300",
              loaded ? "opacity-100" : "opacity-0"
            )}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>

        <p className="mt-3 line-clamp-1 text-center text-sm font-medium text-white/80">{title}</p>
      </div>
    </div>,
    document.body
  );
};

export default PodcastPlayerModal;
