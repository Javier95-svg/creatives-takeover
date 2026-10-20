import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CalendarClock, Loader2, Smile } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { captureEvent } from '@/lib/analytics';
import { insertPostEmoji, POST_MAX_LENGTH, validatePost } from '@/lib/profilePosts';
import { PostImagePicker, type PostImageAttachment } from './PostImagePicker';
import { PostLinkButton } from './PostLinkButton';
import { uploadPostImages } from '@/lib/postImageUploads';
import { clearDraftSource, journeyDraftKey, readDraftSource, readJourneyDraft, type ProfileUpdateSource } from '@/lib/profileUpdateDraft';

const EMOJIS = [
  ['🚀', 'Rocket'], ['🎉', 'Celebration'], ['💡', 'Idea'], ['🛠️', 'Building'],
  ['🌱', 'Growth'], ['🎯', 'Target'], ['📈', 'Progress'], ['🤝', 'Collaboration'],
  ['🙌', 'Raised hands'], ['💪', 'Strength'], ['✨', 'Sparkles'], ['❤️', 'Heart'],
  ['😊', 'Smile'], ['🔥', 'Fire'], ['✅', 'Done'], ['🙏', 'Thanks'],
];

// A blank box is where updates die, so an empty composer offers three ways in.
const UPDATE_PROMPTS = [
  { key: 'shipped', label: 'What I shipped', starter: 'This week I shipped ' },
  { key: 'learned', label: 'What I learned', starter: 'This week I learned ' },
  { key: 'need', label: 'What I need', starter: 'I could use help with ' },
] as const;
type UpdatePrompt = (typeof UPDATE_PROMPTS)[number]['key'];

const SOURCE_HINT: Record<ProfileUpdateSource, string> = {
  stage: 'Started from the stage you completed. Edit it before you post.',
  checkin: 'Started from your program check-in. Edit it before you post; the program still has the full version.',
};

interface Props {
  userId: string;
  name: string;
  avatarUrl: string | null;
  onPublished: (post: PublishedJourneyPost) => void;
  /** Scroll to the composer and focus it, used when arriving from a share prompt. */
  focusOnOpen?: boolean;
}

export interface PublishedJourneyPost {
  id: string;
  content: string;
  publishAt: string;
  imagePath: string | null;
  imageUrl: string | null;
  imagePaths: string[];
  imageUrls: string[];
  scheduled: boolean;
}

export function JourneyPostComposer(props: Props) {
  // Reset all editor state on account changes, including photos and schedules.
  return <JourneyPostEditor key={props.userId} {...props} />;
}

function JourneyPostEditor({ userId, name, avatarUrl, onPublished, focusOnOpen = false }: Props) {
  // Unfinished text stays in this browser tab, isolated by account, and never
  // reaches analytics or the post table. Photos and schedules are not restored.
  const [content, setContent] = useState(() => readJourneyDraft(userId));
  const [draftSource, setDraftSource] = useState<ProfileUpdateSource | null>(() => readDraftSource(userId));
  const [promptUsed, setPromptUsed] = useState<UpdatePrompt | null>(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [images, setImages] = useState<PostImageAttachment[]>([]);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef({ start: 0, end: 0 });
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    try {
      if (content) sessionStorage.setItem(journeyDraftKey(userId), content);
      else sessionStorage.removeItem(journeyDraftKey(userId));
      setDraftSaved(Boolean(content));
    } catch { setDraftSaved(false); }
  }, [content, userId]);

  useLayoutEffect(() => {
    const field = textarea.current;
    if (!field) return;
    field.style.height = 'auto';
    field.style.height = `${Math.min(field.scrollHeight, 320)}px`;
  }, [content]);

  useEffect(() => {
    if (!focusOnOpen) return;
    const field = textarea.current;
    if (!field) return;
    field.scrollIntoView({ block: 'center', behavior: 'smooth' });
    field.focus({ preventScroll: true });
    field.setSelectionRange(field.value.length, field.value.length);
  }, [focusOnOpen]);

  function startWith(prompt: (typeof UPDATE_PROMPTS)[number]) {
    setContent(prompt.starter);
    setPromptUsed(prompt.key);
    selection.current = { start: prompt.starter.length, end: prompt.starter.length };
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(prompt.starter.length, prompt.starter.length);
    });
  }

  function addEmoji(emoji: string) {
    const result = insertPostEmoji(content, emoji, selection.current.start, selection.current.end);
    if (!result) return;
    setContent(result.text);
    selection.current = { start: result.cursor, end: result.cursor };
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(result.cursor, result.cursor);
    });
  }

  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    if (showSchedule && !schedule) { toast.error('Choose a date and time for your post.'); return; }
    const validation = validatePost(content, images.length > 0, schedule);
    if (validation) { toast.error(validation); return; }
    submitting.current = true;
    setBusy(true);
    let uploadedPaths: string[] = [];
    try {
      const uploadedImages = await uploadPostImages(userId, images);
      uploadedPaths = uploadedImages.uploaded;
      const imagePaths = uploadedImages.paths;
      // Validate again after upload, in case the chosen time passed meanwhile.
      const afterUpload = validatePost(content, images.length > 0, schedule);
      if (afterUpload) throw new Error(afterUpload);
      const { data: insertedPost, error } = await supabase.from('profile_posts').insert({
        user_id: userId,
        content: content.trim(),
        image_path: imagePaths[0] || null,
        image_paths: imagePaths,
        ...(schedule ? { publish_at: new Date(schedule).toISOString() } : {}),
      }).select('id,content,image_path,image_paths,publish_at').single();
      if (error) throw error;
      // The post owns these objects now, even if signing a preview fails.
      uploadedPaths = [];

      const { data: signedImages } = imagePaths.length
        ? await supabase.storage.from('profile-posts').createSignedUrls(imagePaths, 3600)
        : { data: [] };
      const imageUrls = imagePaths.map((path) => signedImages?.find((image) => image.path === path)?.signedUrl || '');
      onPublished({
        id: insertedPost.id,
        content: insertedPost.content,
        publishAt: insertedPost.publish_at,
        imagePath: insertedPost.image_path,
        imageUrl: imageUrls[0] || null,
        imagePaths,
        imageUrls,
        scheduled: Boolean(schedule),
      });
      captureEvent('profile_update_published', {
        source: draftSource ?? (promptUsed ? 'prompt' : 'manual'),
        prompt: promptUsed,
        scheduled: Boolean(schedule),
        has_photo: Boolean(insertedPost.image_path),
      });
      clearDraftSource(userId);
      setDraftSource(null);
      setPromptUsed(null);
      toast.success(schedule ? 'Post scheduled. Your journey update is on its way.' : 'Your journey update is live!');
      setContent('');
      setImages([]);
      setSchedule('');
      setShowSchedule(false);
      selection.current = { start: 0, end: 0 };
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from('profile-posts').remove(uploadedPaths);
      console.error('Unable to publish journey post', error);
      toast.error('Could not save your post. Your text and images are still here. Please try again.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <Card className="overflow-hidden border-border/80 bg-card/95 transition-colors focus-within:border-primary/60 focus-within:ring-1 focus-within:ring-primary/15 motion-reduce:transition-none">
      <form onSubmit={publish}>
        <fieldset disabled={busy} className="min-w-0">
          <div className="flex gap-3 p-4 sm:p-6 pb-2 sm:pb-2">
            <Avatar className="h-10 w-10 shrink-0 border border-border">
              <AvatarImage src={avatarUrl || undefined} alt={name} />
              <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <Textarea
                ref={textarea}
                value={content}
                onChange={(event) => setContent(event.target.value)}
                onSelect={(event) => {
                  selection.current = { start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd };
                }}
                aria-label="Your project update"
                placeholder="One small update is enough. What happened today?"
                maxLength={POST_MAX_LENGTH}
                rows={2}
                className="min-h-20 max-h-80 resize-none overflow-y-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-lg md:text-xl"
              />
              {draftSource && content.trim() && <p className="mb-1 text-xs text-muted-foreground">{SOURCE_HINT[draftSource]}</p>}
              {draftSaved && <p className="mb-2 text-xs text-muted-foreground" title="Text saved privately for your account in this browser tab">Draft saved</p>}
            </div>
          </div>
          {!content.trim() && images.length === 0 && (
            <div className="flex flex-wrap items-center gap-2 px-4 pb-3 sm:px-6">
              <span className="text-xs text-muted-foreground">Start with</span>
              {UPDATE_PROMPTS.map((prompt) => (
                <button
                  key={prompt.key}
                  type="button"
                  onClick={() => startWith(prompt)}
                  className="rounded-full border border-border/70 bg-background px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          )}
          <div className="mx-4 mb-3 sm:mx-6"><PostImagePicker images={images} onChange={setImages} disabled={busy} actions={<PostLinkButton value={content} onChange={setContent} textarea={textarea} disabled={busy} />} /></div>
          {showSchedule && (
            <div className="mx-4 mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:mx-6">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="journey-publish-time" className="text-sm font-medium">Publish later</label>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setSchedule(''); setShowSchedule(false); }}>Remove</Button>
              </div>
              <Input id="journey-publish-time" type="datetime-local" value={schedule} onChange={(event) => setSchedule(event.target.value)} required className="mt-2 w-full sm:max-w-xs [color-scheme:light] dark:[color-scheme:dark]" />
              <p className="mt-2 text-xs text-muted-foreground">Your time zone: {timeZone}. Only you can see this post until it goes live.</p>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-1">
              <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
                <PopoverTrigger asChild><Button type="button" variant="ghost" size="icon" aria-label="Add emoji" title="Add emoji"><Smile className="h-4 w-4 text-primary" /></Button></PopoverTrigger>
                <PopoverContent align="start" className="w-64" onCloseAutoFocus={(event) => event.preventDefault()}>
                  <p className="mb-2 text-sm font-medium">A little expression</p>
                  <div className="grid grid-cols-4 gap-1">
                    {EMOJIS.map(([emoji, label]) => <Button key={label} type="button" variant="ghost" aria-label={label} className="text-xl" onClick={() => addEmoji(emoji)}>{emoji}</Button>)}
                  </div>
                </PopoverContent>
              </Popover>
              <Button type="button" variant="ghost" size="icon" aria-label="Schedule post" aria-pressed={showSchedule} title="Schedule post" onClick={() => setShowSchedule(true)}><CalendarClock className={`h-4 w-4 ${showSchedule ? 'text-primary' : 'text-muted-foreground'}`} /></Button>
            </div>
            <div className="flex items-center gap-3">
              {content.length >= POST_MAX_LENGTH - 500 && <span className="text-xs tabular-nums text-muted-foreground" aria-live="polite">{content.length.toLocaleString()}/5,000</span>}
              <Button type="submit" size="sm" className="min-w-20 rounded-full" disabled={busy || (!content.trim() && images.length === 0)}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {busy ? 'Saving…' : schedule ? 'Schedule' : 'Post'}
              </Button>
            </div>
          </div>
        </fieldset>
      </form>
    </Card>
  );
}
