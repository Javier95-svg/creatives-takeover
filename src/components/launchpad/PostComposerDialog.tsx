import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreatePost, useUpdatePost } from '@/hooks/useLaunchpad';
import { useProjects } from '@/hooks/useProjects';
import { BODY_MAX, POST_KINDS, postKind, TITLE_MAX, type LaunchpadPost, type PostKind } from '@/lib/launchpad';
import { LAUNCHPAD_TOPIC_GROUP_LABEL, LAUNCHPAD_TOPICS, launchpadTopic, postPath } from '@/lib/launchpadTopics';
import { cn } from '@/lib/utils';

const NO_PROJECT = 'none';
const KEEP_PROJECT = 'keep';

/**
 * New post, or editing one. A room is required so every post lands somewhere
 * people follow; attaching a project is optional and defaults to the one the
 * founder is working in.
 */
export function PostComposerDialog({ open, onOpenChange, initialTopic, initialKind, editing }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTopic?: string | null;
  initialKind?: PostKind;
  editing?: LaunchpadPost | null;
}) {
  const navigate = useNavigate();
  const { activeProjects, activeProjectId } = useProjects();
  const create = useCreatePost();
  const update = useUpdatePost();
  const [kind, setKind] = useState<PostKind>('feedback');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [topic, setTopic] = useState('');
  const [projectId, setProjectId] = useState(NO_PROJECT);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    if (editing) {
      setKind(postKind(editing.post_type));
      setTitle(editing.title ?? '');
      setContent(editing.content);
      setTopic(editing.topic ?? '');
      // Readers only see the project name, so an edit offers to keep it as is.
      setProjectId(editing.project_name ? KEEP_PROJECT : NO_PROJECT);
    } else {
      setKind(initialKind ?? 'feedback');
      setTitle('');
      setContent('');
      setTopic(initialTopic ?? '');
      setProjectId(activeProjectId ?? NO_PROJECT);
    }
  }, [open, editing, initialTopic, initialKind, activeProjectId]);

  const selectedTopic = launchpadTopic(topic);
  const errors = {
    title: !title.trim() ? 'Add a title.' : null,
    content: content.trim().length < 20 ? 'Write at least a couple of sentences so people can help.' : null,
    topic: !selectedTopic ? 'Choose a room.' : null,
  };
  const valid = !errors.title && !errors.content && !errors.topic;
  const pending = create.isPending || update.isPending;

  const submit = async () => {
    setTouched(true);
    if (!valid) return;
    const chosen = projectId === NO_PROJECT || projectId === KEEP_PROJECT ? null : projectId;
    if (editing) {
      // Undefined leaves the attached project untouched.
      const keep = projectId === KEEP_PROJECT;
      await update.mutateAsync({ id: editing.id, input: { title, content, kind, topic, projectId: keep ? undefined : chosen } });
      onOpenChange(false);
      return;
    }
    const id = await create.mutateAsync({ title, content, kind, topic, projectId: chosen });
    onOpenChange(false);
    navigate(postPath(id));
  };

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-dvh max-w-2xl overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{editing ? 'Edit post' : 'Start a conversation'}</DialogTitle>
        <DialogDescription>Visible to signed-in members and on your public profile.</DialogDescription>
      </DialogHeader>

      <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); void submit().catch(() => undefined); }}>
        <fieldset>
          <legend className="text-sm font-semibold">What kind of post is it?</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {POST_KINDS.map((option) => <button key={option.value} type="button" onClick={() => setKind(option.value)} aria-pressed={kind === option.value}
              className={cn('rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                kind === option.value ? 'border-primary bg-primary/10' : 'border-border/70 hover:border-primary/50')}>
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
            </button>)}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="launchpad-topic">Room</Label>
            <Select value={topic || undefined} onValueChange={setTopic}>
              <SelectTrigger id="launchpad-topic" className="mt-2" aria-invalid={touched && Boolean(errors.topic)}><SelectValue placeholder="Choose a room" /></SelectTrigger>
              <SelectContent>
                {(['stage', 'craft'] as const).map((group) => <SelectGroup key={group}>
                  <SelectLabel>{LAUNCHPAD_TOPIC_GROUP_LABEL[group]}</SelectLabel>
                  {LAUNCHPAD_TOPICS.filter((item) => item.group === group).map((item) => <SelectItem key={item.slug} value={item.slug}>{item.label}</SelectItem>)}
                </SelectGroup>)}
              </SelectContent>
            </Select>
            {touched && errors.topic && <p className="mt-1 text-xs text-destructive">{errors.topic}</p>}
          </div>
          <div>
            <Label htmlFor="launchpad-project">Project <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="launchpad-project" className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {editing?.project_name && <SelectItem value={KEEP_PROJECT}>Keep "{editing.project_name}"</SelectItem>}
                <SelectItem value={NO_PROJECT}>No project</SelectItem>
                {activeProjects.map((project) => <SelectItem key={project.id} value={project.id}>{project.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="launchpad-title">Title</Label>
          <Input id="launchpad-title" className="mt-2" maxLength={TITLE_MAX} value={title} onChange={(event) => setTitle(event.target.value)}
            placeholder={kind === 'feedback' ? 'Would you pay $19/month for this?' : kind === 'milestone' ? 'First 10 paying customers' : 'One line that says what this is about'}
            aria-invalid={touched && Boolean(errors.title)} />
          {touched && errors.title && <p className="mt-1 text-xs text-destructive">{errors.title}</p>}
        </div>

        <div>
          <Label htmlFor="launchpad-body">Details</Label>
          <Textarea id="launchpad-body" className="mt-2 min-h-40" maxLength={BODY_MAX} value={content} onChange={(event) => setContent(event.target.value)}
            placeholder={selectedTopic?.prompt ?? 'Give enough context that someone outside your head can help.'}
            aria-invalid={touched && Boolean(errors.content)} />
          <div className="mt-1 flex justify-between gap-2 text-xs">
            <span className="text-destructive">{touched && errors.content}</span>
            <span className="text-muted-foreground">{content.length}/{BODY_MAX}</span>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" disabled={pending}>{pending ? 'Publishing…' : editing ? 'Save changes' : 'Publish'}</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
