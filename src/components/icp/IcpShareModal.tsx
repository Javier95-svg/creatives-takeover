import { useState } from "react";
import { Check, Copy, ExternalLink, Facebook, Linkedin, X as XIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SHARE_COPY =
  "Just mapped my ICP using @CreativesTakeover — this is exactly who I'm building for. If you're an early-stage founder still guessing at your customer, run this. It takes 60 seconds.";

function linkedinShareUrl(cardUrl: string) {
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(cardUrl)}`;
}

function xShareUrl(cardUrl: string) {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(SHARE_COPY)}&url=${encodeURIComponent(cardUrl)}`;
}

function facebookShareUrl(cardUrl: string) {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(cardUrl)}`;
}

interface IcpShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  personaName: string;
  roleLine: string;
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label} copied`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-3 text-xs font-medium text-muted-foreground transition hover:border-border hover:bg-muted hover:text-foreground"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export function IcpShareModal({
  isOpen,
  onClose,
  shareUrl,
  personaName,
  roleLine,
}: IcpShareModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="w-[calc(100%-2rem)] max-w-md overflow-hidden rounded-4xl border-border p-0 shadow-[0_28px_80px_-32px_rgba(15,23,42,0.45)]">
        {/* Dark header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1e1b4b] px-6 py-7">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-accent-teal/20 blur-3xl" />
          <DialogHeader className="relative space-y-2">
            <p className="text-label font-semibold uppercase tracking-[0.22em] text-[#7dd3fc]">
              Your ICP card is live
            </p>
            <DialogTitle className="text-2xl font-semibold leading-tight tracking-tight text-white">
              {personaName}
            </DialogTitle>
            {roleLine && (
              <p className="text-sm leading-6 text-muted-foreground">{roleLine}</p>
            )}
          </DialogHeader>
        </div>

        {/* Content */}
        <div className="space-y-5 bg-white px-6 py-6">
          {/* Share URL */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Card link
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5">
              <p className="flex-1 truncate text-sm text-foreground">{shareUrl}</p>
              <CopyButton text={shareUrl} label="Link" />
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-muted" />
            <p className="text-label font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Share on social
            </p>
            <div className="h-px flex-1 bg-muted" />
          </div>

          {/* Post copy */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Pre-written post
              </p>
              <CopyButton text={SHARE_COPY} label="Post copy" />
            </div>
            <div className="rounded-xl border border-border bg-muted px-4 py-3 text-sm leading-7 text-foreground">
              {SHARE_COPY}
            </div>
          </div>

          {/* LinkedIn tip */}
          <p className="rounded-xl border border-warning bg-warning-subtle px-4 py-2.5 text-xs leading-5 text-warning">
            <span className="font-semibold">LinkedIn tip:</span> Copy the post above, then click Share — paste it when the dialog opens so your followers see the context.
          </p>

          {/* Share buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Button
              asChild
              className="h-10 gap-1.5 bg-[#0a66c2] text-white hover:bg-[#004182]"
            >
              <a href={linkedinShareUrl(shareUrl)} target="_blank" rel="noreferrer" onClick={() => toast.info("LinkedIn share opened")}>
                <Linkedin className="h-3.5 w-3.5 fill-current" />
                LinkedIn
              </a>
            </Button>

            <Button
              asChild
              variant="outline"
              className="h-10 gap-1.5 border-border text-foreground hover:bg-muted"
            >
              <a href={xShareUrl(shareUrl)} target="_blank" rel="noreferrer" onClick={() => toast.info("X share opened")}>
                <XIcon className="h-3.5 w-3.5" />
                X
              </a>
            </Button>

            <Button
              asChild
              className="h-10 gap-1.5 bg-[#1877f2] text-white hover:bg-[#0c63d4]"
            >
              <a href={facebookShareUrl(shareUrl)} target="_blank" rel="noreferrer" onClick={() => toast.info("Facebook share opened")}>
                <Facebook className="h-3.5 w-3.5 fill-current" />
                Facebook
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
