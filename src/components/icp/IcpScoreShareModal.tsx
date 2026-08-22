import { useEffect, useRef, useState } from "react";
import { Check, Copy, Facebook, Linkedin, Loader2, Share2, X as XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getSafeLocalStorage } from "@/lib/safeStorage";
import { buildIcpShareText, type IcpScoreCard } from "@/lib/icpScoreCard";

/**
 * Sharing, moved out of the page footer.
 *
 * The share bar sat at the bottom of a long document, which meant the people
 * most likely to share - the ones who just read their score and felt something
 * about it - had to scroll past the entire draft to find it. Most never did.
 *
 * What gets shared is always the score card, never the ICP draft. The score is
 * the part a stranger can react to in one glance; the draft is a working
 * document that means nothing without context, and giving it away costs the
 * thing an account is for.
 */

const AUTO_OPEN_DELAY_MS = 7_000;
const AUTO_OPEN_KEY_PREFIX = "ct_icp_score_share_prompted_";

function linkedinShareUrl(url: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
}

function xShareUrl(url: string, text: string) {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
}

function facebookShareUrl(url: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
}

export interface IcpScoreShareModalProps {
  card: IcpScoreCard;
  /** Mints (or returns) the public score-card URL. */
  onResolveUrl: () => Promise<string | null>;
  /**
   * Identifies this idea for the auto-open guard, so a founder is prompted at
   * most once per result rather than on every visit.
   */
  autoOpenKey?: string | null;
}

export function IcpScoreShareModal({ card, onResolveUrl, autoOpenKey }: IcpScoreShareModalProps) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [resolving, setResolving] = useState(false);
  const [copied, setCopied] = useState(false);
  const hasAutoOpened = useRef(false);

  /*
   * Opens once, after a dwell long enough that the founder has actually read
   * the number. Prompting the instant the score renders covers the one thing
   * that makes someone want to share it. Dismissal is remembered, so this never
   * becomes a nag on a result they come back to.
   */
  useEffect(() => {
    if (!autoOpenKey || hasAutoOpened.current) return;
    const storage = getSafeLocalStorage();
    const key = `${AUTO_OPEN_KEY_PREFIX}${autoOpenKey}`;
    if (storage?.getItem(key)) return;

    const timer = setTimeout(() => {
      hasAutoOpened.current = true;
      storage?.setItem(key, "1");
      setOpen(true);
    }, AUTO_OPEN_DELAY_MS);

    return () => clearTimeout(timer);
  }, [autoOpenKey]);

  const ensureUrl = async (): Promise<string | null> => {
    if (url) return url;
    setResolving(true);
    try {
      const resolved = await onResolveUrl();
      if (resolved) setUrl(resolved);
      return resolved;
    } finally {
      setResolving(false);
    }
  };

  // Minted when the modal opens rather than on each button, so the first click
  // on a network does not wait on a round trip.
  useEffect(() => {
    if (open && !url && !resolving) void ensureUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const shareText = buildIcpShareText(card);

  const handleCopy = async () => {
    const resolved = await ensureUrl();
    if (!resolved) return;
    try {
      await navigator.clipboard.writeText(resolved);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  const handleNetwork = async (network: "x" | "linkedin" | "facebook") => {
    const resolved = await ensureUrl();
    if (!resolved) return;
    const target =
      network === "x"
        ? xShareUrl(resolved, shareText)
        : network === "linkedin"
          ? linkedinShareUrl(resolved)
          : facebookShareUrl(resolved);
    window.open(target, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Button type="button" size="lg" className="gap-2" onClick={() => setOpen(true)}>
        <Share2 className="h-4 w-4" />
        Share your {card.displayScore}/100
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Share your {card.displayScore}/100</DialogTitle>
          </DialogHeader>

          <p className="text-sm leading-6 text-muted-foreground">
            Anyone with the link sees your score and the verdict. Your ICP draft stays private.
          </p>

          <div className="rounded-2xl border border-border bg-muted/40 p-4">
            <p className="whitespace-pre-line text-sm leading-6 text-foreground/80">{shareText}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button
              type="button"
              variant="outline"
              className="gap-1.5"
              onClick={() => void handleCopy()}
              disabled={resolving}
            >
              {resolving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : copied ? (
                <Check className="h-3.5 w-3.5 text-success" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied" : "Copy"}
            </Button>
            <Button type="button" variant="outline" className="gap-1.5" onClick={() => void handleNetwork("x")}>
              <XIcon className="h-3.5 w-3.5" />X
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 text-[#0a66c2]"
              onClick={() => void handleNetwork("linkedin")}
            >
              <Linkedin className="h-3.5 w-3.5 fill-current" />
              LinkedIn
            </Button>
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 text-[#1877f2]"
              onClick={() => void handleNetwork("facebook")}
            >
              <Facebook className="h-3.5 w-3.5 fill-current" />
              Facebook
            </Button>
          </div>

          {url ? (
            <p className="truncate text-xs text-muted-foreground" title={url}>
              {url}
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
