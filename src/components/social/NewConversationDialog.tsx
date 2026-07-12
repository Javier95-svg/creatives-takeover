import { useEffect, useState } from 'react';
import { Loader2, MessageSquarePlus, Search, Users, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { messagingV2, mapRecipient, type MessageRecipient } from '@/lib/messagingV2';

type Props = {
  onStartDirect: (userId: string) => Promise<string | null>;
  onStartGroup: (input: { name: string; participantIds: string[]; purpose: string }) => Promise<string | null>;
  onCreated: (conversationId: string) => void;
};

export const NewConversationDialog = ({ onStartDirect, onStartGroup, onCreated }: Props) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MessageRecipient[]>([]);
  const [selected, setSelected] = useState<MessageRecipient[]>([]);
  const [groupName, setGroupName] = useState('');
  const [purpose, setPurpose] = useState('accountability');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let current = true;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const rows = await messagingV2.recipients(query.trim());
        if (current) setResults((rows || []).map(mapRecipient));
      } finally {
        if (current) setLoading(false);
      }
    }, 220);
    return () => { current = false; window.clearTimeout(timer); };
  }, [open, query]);

  const finish = (conversationId: string | null) => {
    if (!conversationId) return;
    setOpen(false);
    setQuery('');
    setSelected([]);
    setGroupName('');
    onCreated(conversationId);
  };

  const createGroup = async () => {
    if (selected.length < 2 || groupName.trim().length < 3) return;
    setCreating(true);
    try {
      finish(await onStartGroup({ name: groupName.trim(), participantIds: selected.map((recipient) => recipient.userId), purpose }));
    } finally {
      setCreating(false);
    }
  };
  const visibleResults = mode === 'direct' ? results : results.filter((recipient) => recipient.isConnection);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" className="h-9 gap-2" aria-label="Start a new message">
          <MessageSquarePlus className="h-4 w-4" />
          <span className="hidden sm:inline">New</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
          <DialogDescription>Find a founder or create a small, purpose-led founder workspace.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
          <Button type="button" size="sm" variant={mode === 'direct' ? 'secondary' : 'ghost'} onClick={() => setMode('direct')}>Direct message</Button>
          <Button type="button" size="sm" variant={mode === 'group' ? 'secondary' : 'ghost'} onClick={() => setMode('group')}><Users className="mr-2 h-4 w-4" />Founder workspace</Button>
        </div>
        {mode === 'group' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={groupName} onChange={(event) => setGroupName(event.target.value)} placeholder="Workspace name" maxLength={80} />
            <select className="min-h-10 rounded-md border bg-background px-3 text-sm" value={purpose} onChange={(event) => setPurpose(event.target.value)}>
              <option value="accountability">Accountability</option>
              <option value="cofounder_search">Co-founder search</option>
              <option value="mentor_circle">Mentor circle</option>
              <option value="project_collaboration">Project collaboration</option>
            </select>
          </div>
        )}
        {selected.length > 0 && mode === 'group' && (
          <div className="flex flex-wrap gap-2">
            {selected.map((recipient) => <Badge key={recipient.userId} variant="secondary" className="gap-1 py-1">{recipient.fullName}<button type="button" onClick={() => setSelected((items) => items.filter((item) => item.userId !== recipient.userId))} aria-label={`Remove ${recipient.fullName}`}><X className="h-3 w-3" /></button></Badge>)}
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search founders by name or username" className="pl-9" autoFocus />
        </div>
        <div className="max-h-72 space-y-1 overflow-y-auto" role="listbox" aria-label="Eligible message recipients">
          {loading && <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Searching</div>}
          {!loading && query.trim().length >= 2 && visibleResults.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">{mode === 'group' ? 'No matching connections found. Founder workspaces can only include connections.' : 'No eligible founders found.'}</p>}
          {visibleResults.map((recipient) => {
            const isSelected = selected.some((item) => item.userId === recipient.userId);
            return <button key={recipient.userId} type="button" role="option" aria-selected={isSelected} className="flex min-h-14 w-full items-center gap-3 rounded-lg px-3 text-left hover:bg-muted" onClick={async () => {
              if (mode === 'direct') {
                setCreating(true);
                try { finish(await onStartDirect(recipient.userId)); } finally { setCreating(false); }
              } else {
                setSelected((items) => isSelected ? items.filter((item) => item.userId !== recipient.userId) : items.length < 7 ? [...items, recipient] : items);
              }
            }}>
              <Avatar className="h-9 w-9"><AvatarImage src={recipient.avatarUrl || undefined} /><AvatarFallback>{recipient.fullName.charAt(0)}</AvatarFallback></Avatar>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{recipient.fullName}</span><span className="block truncate text-xs text-muted-foreground">{recipient.isConnection ? 'Connection · ' : ''}{recipient.headline || recipient.username || 'Founder'}</span></span>
              {recipient.isMentor && <Badge variant="outline">Mentor</Badge>}
            </button>;
          })}
        </div>
        {mode === 'group' && <Button type="button" onClick={createGroup} disabled={creating || selected.length < 2 || groupName.trim().length < 3}>{creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Users className="mr-2 h-4 w-4" />}Create workspace ({selected.length + 1}/8)</Button>}
      </DialogContent>
    </Dialog>
  );
};
