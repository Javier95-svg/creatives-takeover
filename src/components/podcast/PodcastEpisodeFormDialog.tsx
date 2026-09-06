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
import {
  normalizeGuestWebsite,
  normalizeInstagramUrl,
  normalizeLinkedInUrl,
  parseHashtagsInput,
  parseYouTubeId,
} from "@/lib/podcast";
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
  const [mentorSlug, setMentorSlug] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestWebsite, setGuestWebsite] = useState("");
  const [guestLinkedIn, setGuestLinkedIn] = useState("");
  const [guestInstagram, setGuestInstagram] = useState("");
  const [isPublished, setIsPublished] = useState(true);

  // Reset the form whenever the dialog opens for a new/different episode.
  useEffect(() => {
    if (!open) return;
    setTitle(episode?.title ?? "");
    setYoutubeUrl(episode?.youtube_url ?? "");
    setDescription(episode?.description ?? "");
    setHashtagsInput(episode?.hashtags?.join(" ") ?? "");
    setMentorSlug(episode?.mentor_slug ?? "");
    setGuestName(episode?.guest_name ?? "");
    setGuestWebsite(episode?.guest_website ?? "");
    setGuestLinkedIn(episode?.guest_linkedin ?? "");
    setGuestInstagram(episode?.guest_instagram ?? "");
    setIsPublished(episode?.is_published ?? true);
  }, [open, episode]);

  const previewTags = parseHashtagsInput(hashtagsInput);
  const validVideo = Boolean(parseYouTubeId(youtubeUrl));
  // Empty is fine (the field is optional); typed-but-unparseable is not, since
  // it would be silently dropped on save.
  const normalizedGuestWebsite = normalizeGuestWebsite(guestWebsite);
  const validGuestWebsite = !guestWebsite.trim() || Boolean(normalizedGuestWebsite);
  const normalizedLinkedIn = normalizeLinkedInUrl(guestLinkedIn);
  const validLinkedIn = !guestLinkedIn.trim() || Boolean(normalizedLinkedIn);
  const normalizedInstagram = normalizeInstagramUrl(guestInstagram);
  const validInstagram = !guestInstagram.trim() || Boolean(normalizedInstagram);
  const canSubmit =
    title.trim().length > 0 &&
    validVideo &&
    validGuestWebsite &&
    validLinkedIn &&
    validInstagram &&
    !isSaving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const result = await onSubmit({
      title,
      description,
      youtube_url: youtubeUrl,
      hashtags: previewTags,
      mentor_slug: mentorSlug,
      guest_name: guestName,
      guest_website: guestWebsite,
      guest_linkedin: guestLinkedIn,
      guest_instagram: guestInstagram,
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="podcast-guest-name">Guest name (optional)</Label>
              <Input
                id="podcast-guest-name"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="e.g. Darya Kablash"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="podcast-guest-website">Project website (optional)</Label>
              <Input
                id="podcast-guest-website"
                value={guestWebsite}
                onChange={(e) => setGuestWebsite(e.target.value)}
                placeholder="getmarketing.com"
                aria-invalid={!validGuestWebsite}
              />
              {guestWebsite.trim() && !validGuestWebsite ? (
                <p className="text-xs text-destructive">
                  That doesn’t look like a valid website address.
                </p>
              ) : (
                normalizedGuestWebsite && (
                  <p className="truncate text-xs text-muted-foreground">
                    Links to {normalizedGuestWebsite}
                  </p>
                )
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="podcast-guest-linkedin">Guest LinkedIn (optional)</Label>
              <Input
                id="podcast-guest-linkedin"
                value={guestLinkedIn}
                onChange={(e) => setGuestLinkedIn(e.target.value)}
                placeholder="linkedin.com/in/darya-kablash"
                aria-invalid={!validLinkedIn}
              />
              {guestLinkedIn.trim() && !validLinkedIn ? (
                <p className="text-xs text-destructive">
                  Enter a LinkedIn profile URL or vanity name.
                </p>
              ) : (
                normalizedLinkedIn && (
                  <p className="truncate text-xs text-muted-foreground">
                    Links to {normalizedLinkedIn}
                  </p>
                )
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="podcast-guest-instagram">Guest Instagram (optional)</Label>
              <Input
                id="podcast-guest-instagram"
                value={guestInstagram}
                onChange={(e) => setGuestInstagram(e.target.value)}
                placeholder="@daryakablash"
                aria-invalid={!validInstagram}
              />
              {guestInstagram.trim() && !validInstagram ? (
                <p className="text-xs text-destructive">
                  Enter an Instagram handle or profile URL.
                </p>
              ) : (
                normalizedInstagram && (
                  <p className="truncate text-xs text-muted-foreground">
                    Links to {normalizedInstagram}
                  </p>
                )
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="podcast-mentor-slug">Mentor interview (optional)</Label>
            <Input
              id="podcast-mentor-slug"
              value={mentorSlug}
              onChange={(e) => setMentorSlug(e.target.value)}
              placeholder="charlotte-joseph"
            />
            <p className="text-xs text-muted-foreground">
              The mentor slug from their profile URL. Set it to show this episode on
              creatives-takeover.com/mentorship/&lt;slug&gt;. Leave blank for non-interview episodes.
            </p>
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
