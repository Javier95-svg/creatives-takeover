import { useRef, useState, type RefObject } from 'react';
import { Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { insertPostLink } from '@/lib/postLinks';
import { POST_MAX_LENGTH } from '@/lib/profilePosts';

export function PostLinkButton({ value, onChange, textarea, disabled }: {
  value: string;
  onChange: (value: string) => void;
  textarea: RefObject<HTMLTextAreaElement | null>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const range = useRef({ start: 0, end: 0 });
  function save() {
    const result = insertPostLink(value, label, url, range.current.start, range.current.end);
    if (!result) { setError('Enter link text and a valid URL starting with https:// or http://.'); return; }
    if (result.text.length > POST_MAX_LENGTH) { setError('Keep your update within 5,000 characters.'); return; }
    onChange(result.text);
    setOpen(false);
    requestAnimationFrame(() => {
      textarea.current?.focus();
      textarea.current?.setSelectionRange(result.cursor, result.cursor);
    });
  }
  return <>
    <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label="Insert link" title="Insert link" onClick={() => {
      range.current = { start: textarea.current?.selectionStart ?? value.length, end: textarea.current?.selectionEnd ?? value.length };
      setLabel(value.slice(range.current.start, range.current.end));
      setUrl('');
      setError('');
      setOpen(true);
    }}><Link2 className="h-4 w-4 text-primary" /></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent onCloseAutoFocus={(event) => event.preventDefault()}>
        <DialogHeader><DialogTitle>Insert link</DialogTitle><DialogDescription>Choose the text readers will click and its destination.</DialogDescription></DialogHeader>
        <label className="space-y-2 text-sm font-medium"><span>Selected text</span><Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Text to display" /></label>
        <label className="space-y-2 text-sm font-medium"><span>URL</span><Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com" type="url" /></label>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter><Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button type="button" onClick={save}>Insert link</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
