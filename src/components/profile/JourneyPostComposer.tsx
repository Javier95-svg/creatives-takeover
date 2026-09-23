import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { CalendarClock, ImagePlus, Loader2, Smile, X } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { insertPostEmoji, POST_MAX_LENGTH, validatePost, validatePostImage } from '@/lib/profilePosts';

const EMOJIS = [
  ['🚀', 'Rocket'], ['🎉', 'Celebration'], ['💡', 'Idea'], ['🛠️', 'Building'],
  ['🌱', 'Growth'], ['🎯', 'Target'], ['📈', 'Progress'], ['🤝', 'Collaboration'],
  ['🙌', 'Raised hands'], ['💪', 'Strength'], ['✨', 'Sparkles'], ['❤️', 'Heart'],
  ['😊', 'Smile'], ['🔥', 'Fire'], ['✅', 'Done'], ['🙏', 'Thanks'],
];

// Keep unfinished text in this browser tab, isolated by account. Never send
// drafts to analytics or the public post table. Photos and schedules are not restored.
const draftKey = (userId: string) => `ct:journey-draft:v1:${userId}`;
function readDraft(userId: string) {
  try { return sessionStorage.getItem(draftKey(userId))?.slice(0, POST_MAX_LENGTH) ?? ''; }
  catch { return ''; }
}

interface Props {
  userId: string;
  name: string;
  avatarUrl: string | null;
  onPublished: (post: PublishedJourneyPost) => void;
}

export interface PublishedJourneyPost {
  id: string;
  content: string;
  publishAt: string;
  imagePath: string | null;
  imageUrl: string | null;
  scheduled: boolean;
}

export function JourneyPostComposer(props: Props) {
  // Reset all editor state on account changes, including photos and schedules.
  return <JourneyPostEditor key={props.userId} {...props} />;
}

function JourneyPostEditor({ userId, name, avatarUrl, onPublished }: Props) {
  const [content, setContent] = useState(() => readDraft(userId));
  const [draftSaved, setDraftSaved] = useState(false);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef({ start: 0, end: 0 });
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    try {
      if (content) sessionStorage.setItem(draftKey(userId), content);
      else sessionStorage.removeItem(draftKey(userId));
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
    if (!photo) { setPreview(null); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

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
    const validation = validatePost(content, !!photo, schedule);
    if (validation) { toast.error(validation); return; }
    submitting.current = true;
    setBusy(true);
    let uploadedPath: string | null = null;
    try {
      if (photo) {
        const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
        uploadedPath = `${userId}/${crypto.randomUUID()}.${extensions[photo.type]}`;
        const { error } = await supabase.storage.from('profile-posts').upload(uploadedPath, photo);
        if (error) { uploadedPath = null; throw error; }
      }
      // Validate again after upload, in case the chosen time passed meanwhile.
      const afterUpload = validatePost(content, !!photo, schedule);
      if (afterUpload) throw new Error(afterUpload);
      const { data: insertedPost, error } = await supabase.from('profile_posts').insert({
        user_id: userId,
        content: content.trim(),
        image_path: uploadedPath,
        ...(schedule ? { publish_at: new Date(schedule).toISOString() } : {}),
      }).select('id,content,image_path,publish_at').single();
      if (error) throw error;

      let imageUrl: string | null = null;
      if (insertedPost.image_path) {
        const { data: signedImage } = await supabase.storage
          .from('profile-posts')
          .createSignedUrl(insertedPost.image_path, 3600);
        imageUrl = signedImage?.signedUrl ?? null;
      }

      onPublished({
        id: insertedPost.id,
        content: insertedPost.content,
        publishAt: insertedPost.publish_at,
        imagePath: insertedPost.image_path,
        imageUrl,
        scheduled: Boolean(schedule),
      });
      uploadedPath = null;
      toast.success(schedule ? 'Post scheduled. Your journey update is on its way.' : 'Your journey update is live!');
      setContent('');
      setPhoto(null);
      setSchedule('');
      setShowSchedule(false);
      selection.current = { start: 0, end: 0 };
    } catch (error) {
      if (uploadedPath) await supabase.storage.from('profile-posts').remove([uploadedPath]);
      console.error('Unable to publish journey post', error);
      toast.error('Could not save your post. Your text and photo are still here. Please try again.');
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
                aria-label="Your journey update"
                placeholder="One small update is enough. What happened today?"
                maxLength={POST_MAX_LENGTH}
                rows={2}
                className="min-h-20 max-h-80 resize-none overflow-y-auto border-0 bg-transparent px-0 shadow-none focus-visible:ring-0 text-base md:text-base"
              />
              {draftSaved && <p className="mb-2 text-xs text-muted-foreground" title="Text saved privately for your account in this browser tab">Draft saved</p>}
            </div>
          </div>
          {preview && (
            <div className="relative mx-4 mb-4 sm:mx-6 rounded-lg border border-border bg-muted/30">
              <img src={preview} alt="Photo attached to your update" className="max-h-80 w-full rounded-lg object-contain" />
              <Button type="button" variant="secondary" size="icon" aria-label="Remove photo" className="absolute right-2 top-2" onClick={() => setPhoto(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
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
              <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp,image/gif" aria-label="Attach a photo" className="hidden" onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                const error = validatePostImage(file);
                if (error) { toast.error(error); return; }
                setPhoto(file);
              }} />
              <Button type="button" variant="ghost" size="icon" onClick={() => fileInput.current?.click()} aria-label="Add photo" title="Add photo (up to 5 MB)"><ImagePlus className="h-4 w-4 text-primary" /></Button>
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
              <Button type="submit" size="sm" className="min-w-20 rounded-full" disabled={busy || (!content.trim() && !photo)}>
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
