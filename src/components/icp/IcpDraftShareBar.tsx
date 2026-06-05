import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Check, Download, Share2, Facebook, Linkedin, X as XIcon, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";

const SHARE_COPY =
  "Just mapped my ICP using @CreativesTakeover — this is exactly who I'm building for. If you're an early-stage founder still guessing at your customer, run this. It takes 60 seconds.";

interface IcpDraftShareBarProps {
  /** The public share URL for this draft. Null if sharing not yet set up (will trigger share setup first). */
  shareUrl: string | null;
  /** The path guests should return to after signing up. */
  returnPath: string;
  /** Called when the user clicks Share and needs the URL generated. */
  onShare?: () => Promise<string | null>;
  /** Called when the user clicks Save → PDF. */
  onSavePdf?: () => Promise<void>;
  /** Called when the user clicks Save → DOCX. */
  onSaveDocx?: () => Promise<void>;
  isSaving?: boolean;
  isSharing?: boolean;
}

export function IcpDraftShareBar({
  shareUrl,
  returnPath,
  onShare,
  onSavePdf,
  onSaveDocx,
  isSaving = false,
  isSharing = false,
}: IcpDraftShareBarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(shareUrl);

  const signUpPath = `/signup?source=icp-draft-share&return=${encodeURIComponent(returnPath)}`;

  const requireAuth = (action: string): boolean => {
    if (user) return true;
    toast.info(`Create a free account to ${action} your ICP Draft.`);
    navigate(signUpPath);
    return false;
  };

  const getOrCreateShareUrl = async (): Promise<string | null> => {
    if (resolvedUrl) return resolvedUrl;
    if (!onShare) return null;
    const url = await onShare();
    if (url) setResolvedUrl(url);
    return url;
  };

  const handleCopyLink = async () => {
    if (!requireAuth("share")) return;
    const url = await getOrCreateShareUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleSocialShare = async (platform: "x" | "linkedin" | "facebook") => {
    if (!requireAuth("share")) return;
    const url = await getOrCreateShareUrl();
    if (!url) return;

    const encoded = encodeURIComponent(url);
    const textEncoded = encodeURIComponent(SHARE_COPY);

    const shareUrls: Record<typeof platform, string> = {
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`,
      x: `https://x.com/intent/tweet?text=${textEncoded}&url=${encoded}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`,
    };

    window.open(shareUrls[platform], "_blank", "noopener,noreferrer");
  };

  const handleSavePdf = async () => {
    if (!requireAuth("save")) return;
    await onSavePdf?.();
  };

  const handleSaveDocx = async () => {
    if (!requireAuth("save")) return;
    await onSaveDocx?.();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/80 px-5 py-3.5 shadow-sm backdrop-blur">
      <span className="text-sm font-semibold text-foreground/70">Share your ICP Draft</span>

      <div className="flex flex-wrap items-center gap-2">
        {/* Copy link */}
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 border-border/60 text-sm"
          onClick={() => void handleCopyLink()}
          disabled={isSharing}
        >
          {isSharing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {copied ? "Copied" : "Copy Link"}
        </Button>

        {/* X */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-sm text-foreground hover:bg-foreground/5"
          onClick={() => void handleSocialShare("x")}
        >
          <XIcon className="h-3.5 w-3.5" />
          X
        </Button>

        {/* LinkedIn */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-sm text-[#0a66c2] hover:bg-[#0a66c2]/5"
          onClick={() => void handleSocialShare("linkedin")}
        >
          <Linkedin className="h-3.5 w-3.5 fill-current" />
          LinkedIn
        </Button>

        {/* Facebook */}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1.5 text-sm text-[#1877f2] hover:bg-[#1877f2]/5"
          onClick={() => void handleSocialShare("facebook")}
        >
          <Facebook className="h-3.5 w-3.5 fill-current" />
          Facebook
        </Button>

        {/* Divider */}
        <div className="h-5 w-px bg-border/60" aria-hidden />

        {/* Save dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 border-border/60 text-sm"
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Save
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem
              className="gap-2 text-sm"
              onClick={() => void handleSavePdf()}
            >
              <FileText className="h-3.5 w-3.5 text-red-500" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2 text-sm"
              onClick={() => void handleSaveDocx()}
            >
              <FileText className="h-3.5 w-3.5 text-blue-500" />
              Download DOCX
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
