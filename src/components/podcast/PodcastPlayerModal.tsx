import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { youtubeEmbedUrl } from "@/lib/podcast";

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

        <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
          <iframe
            src={youtubeEmbedUrl(videoId, true)}
            title={title}
            className="h-full w-full"
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
