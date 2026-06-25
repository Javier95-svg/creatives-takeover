import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { parseHashtagsInput, parseYouTubeId } from "@/lib/podcast";
import type { PodcastEpisode, PodcastEpisodeInput } from "@/hooks/usePodcastEpisodes";

interface PodcastEpisodeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  episode?: PodcastEpisode | null;
  isSaving: boolean;
  onSubmit: (input: PodcastEpisodeInput) => Promise<unknown>;
}

const PodcastEpisodeFormDialog = ({
  open,
  onOpenChange,
  episode,
  isSaving,
  onSubmit,
}: PodcastEpisodeFormDialogProps) => {
  const [title, setTitle] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [description, setDescription] = useState("");
  const [hashtagsInput, setHashtagsInput] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  // Reset the form whenever the dialog opens for a new/different episode.
  useEffect(() => {
    if (!open) return;
    setTitle(episode?.title ?? "");
    setYoutubeUrl(episode?.youtube_url ?? "");
    setDescription(episode?.description ?? "");
    setHashtagsInput(episode?.hashtags?.join(" ") ?? "");
    setIsPublished(episode?.is_published ?? true);
  }, [open, episode]);

  const previewTags = parseHashtagsInput(hashtagsInput);
  const validVideo = Boolean(parseYouTubeId(youtubeUrl));
  const canSubmit = title.trim().length > 0 && validVideo && !isSaving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const result = await onSubmit({
      title,
      description,
      youtube_url: youtubeUrl,
      hashtags: previewTags,
      is_published: isPublished,
    });
    if (result) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{episode ? "Edit episode" : "Add episode"}</DialogTitle>
          <DialogDescription>
            Paste a YouTube link — the thumbnail and in-platform player are generated automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="podcast-youtube">YouTube link</Label>
            <Input
              id="podcast-youtube"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            {youtubeUrl.trim() && !validVideo && (
              <p className="text-xs text-destructive">That doesn’t look like a valid YouTube link.</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="podcast-title">Episode title</Label>
            <Input
              id="podcast-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. How Acme found product–market fit the hard way"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="podcast-description">Description</Label>
            <Textarea
              id="podcast-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this episode is about and the key takeaways…"
              rows={4}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="podcast-hashtags">Hashtags</Label>
            <Input
              id="podcast-hashtags"
              value={hashtagsInput}
              onChange={(e) => setHashtagsInput(e.target.value)}
              placeholder="#founders #pmf #fundraising"
            />
            {previewTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {previewTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="rounded-full text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-foreground">Published</p>
              <p className="text-xs text-muted-foreground">Off keeps it as a draft only you can see.</p>
            </div>
            <Switch checked={isPublished} onCheckedChange={setIsPublished} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {episode ? "Save changes" : "Publish episode"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PodcastEpisodeFormDialog;
