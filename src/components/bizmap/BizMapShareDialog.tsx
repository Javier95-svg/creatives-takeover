import { Copy, ExternalLink, Globe, Linkedin, Loader2, Lock, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { BizMapSharedOutputRecord, BizMapShareVisibility } from '@/lib/bizmapSharing';
import { getBizMapShareUrl } from '@/lib/bizmapSharing';

interface BizMapShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPreparing: boolean;
  isUpdatingVisibility: boolean;
  record: BizMapSharedOutputRecord | null;
  onCopyLink: () => void;
  onOpenSharedPage: () => void;
  onShareOnLinkedIn: () => void;
  onCopyLinkedInPost: () => void;
  onUpdateVisibility: (visibility: BizMapShareVisibility) => void;
  onRegenerateLink: () => void;
}

export function BizMapShareDialog({
  open,
  onOpenChange,
  isPreparing,
  isUpdatingVisibility,
  record,
  onCopyLink,
  onOpenSharedPage,
  onShareOnLinkedIn,
  onCopyLinkedInPost,
  onUpdateVisibility,
  onRegenerateLink,
}: BizMapShareDialogProps) {
  const isBusy = isPreparing || isUpdatingVisibility;
  const shareUrl = record ? getBizMapShareUrl(record.slug) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Share this BizMap output</DialogTitle>
          <DialogDescription>
            Turn this private result into a link you can send to a co-founder, advisor, or your network.
          </DialogDescription>
        </DialogHeader>

        {!record ? (
          <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Preparing your share link...
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border/60 bg-muted/25 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{record.title}</p>
                  <p className="text-xs text-muted-foreground">{record.summary}</p>
                </div>
                <Badge variant={record.visibility === 'public' ? 'default' : record.visibility === 'unlisted' ? 'secondary' : 'outline'}>
                  {record.visibility === 'public' ? 'Public' : record.visibility === 'unlisted' ? 'Unlisted' : 'Private'}
                </Badge>
              </div>

              <div className="mt-4 rounded-xl border border-border/60 bg-background px-3 py-2 text-xs text-muted-foreground break-all">
                {shareUrl}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button onClick={onCopyLink} disabled={isBusy} className="justify-start gap-2">
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
              <Button onClick={onOpenSharedPage} disabled={isBusy} variant="outline" className="justify-start gap-2">
                <ExternalLink className="h-4 w-4" />
                Open shared page
              </Button>
              <Button onClick={onShareOnLinkedIn} disabled={isBusy} variant="outline" className="justify-start gap-2">
                <Linkedin className="h-4 w-4" />
                Share on LinkedIn
              </Button>
              <Button onClick={onCopyLinkedInPost} disabled={isBusy} variant="outline" className="justify-start gap-2">
                <Copy className="h-4 w-4" />
                Copy LinkedIn post text
              </Button>
            </div>

            <div className="rounded-2xl border border-border/60 p-4">
              <p className="text-sm font-semibold">Visibility</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Unlisted links are shareable but not meant for discovery. Public links can be indexed later. Private disables access.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={record.visibility === 'unlisted' ? 'default' : 'outline'}
                  disabled={isBusy}
                  onClick={() => onUpdateVisibility('unlisted')}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Unlisted
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={record.visibility === 'public' ? 'default' : 'outline'}
                  disabled={isBusy}
                  onClick={() => onUpdateVisibility('public')}
                  className="gap-2"
                >
                  <Globe className="h-4 w-4" />
                  Public
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={record.visibility === 'private' ? 'default' : 'outline'}
                  disabled={isBusy}
                  onClick={() => onUpdateVisibility('private')}
                  className="gap-2"
                >
                  <Lock className="h-4 w-4" />
                  Disable link
                </Button>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="ghost" onClick={onRegenerateLink} disabled={!record || isBusy} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Regenerate link
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
