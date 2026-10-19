import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { Loader2, Trash2, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ConnectionAccount {
  account_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  connected_at: string;
}

interface ConnectionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  username: string | null;
  profileName: string;
  canManage?: boolean;
}

export function ConnectionsDialog({ open, onOpenChange, username, profileName, canManage = false }: ConnectionsDialogProps) {
  const [connections, setConnections] = useState<ConnectionAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [removingAccountId, setRemovingAccountId] = useState<string | null>(null);

  const removeConnection = async (connection: ConnectionAccount) => {
    if (removingAccountId || !window.confirm(`Remove your connection with ${connection.full_name || connection.username || 'this account'}?`)) {
      return;
    }

    setRemovingAccountId(connection.account_id);
    const { error: removeError } = await supabase.rpc(
      'remove_profile_connection_v1' as never,
      { p_connection_id: connection.account_id } as never,
    );
    setRemovingAccountId(null);

    if (removeError) {
      toast.error('We could not remove this connection. Please try again.');
      return;
    }

    setConnections((current) => current.filter((item) => item.account_id !== connection.account_id));
    toast.success('Connection removed.');
  };

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    if (!username) {
      setConnections([]);
      setLoading(false);
      return;
    }

    void supabase.rpc('public_profile_connections_v1' as never, { p_username: username } as never)
      .then(({ data, error: rpcError }) => {
        if (cancelled) return;
        if (rpcError) {
          setError("We couldn't load your connections. Please try again.");
          return;
        }
        setConnections(Array.isArray(data) ? data as ConnectionAccount[] : []);
      })
      .catch(() => {
        if (!cancelled) setError("We couldn't load your connections. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [open, reloadToken, username]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(680px,calc(100dvh-2rem))] max-w-md flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>{profileName}'s connections</DialogTitle>
          <DialogDescription>
            Accounts connected after either person accepted the other's request.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Loading connections…
            </div>
          )}

          {!loading && error && (
            <div className="py-10 text-center">
              <p className="mb-4 text-sm text-muted-foreground">{error}</p>
              <Button type="button" variant="outline" onClick={() => setReloadToken((value) => value + 1)}>
                Try again
              </Button>
            </div>
          )}

          {!loading && !error && connections.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              <Users className="mx-auto mb-3 h-10 w-10 opacity-50" aria-hidden="true" />
              <p className="font-medium text-foreground">No connections yet</p>
              <p className="mt-1 text-sm">Accepted connections will appear here.</p>
            </div>
          )}

          {!loading && !error && connections.length > 0 && (
            <ul className="space-y-2" aria-label="Connected accounts">
              {connections.map((connection) => {
                const name = connection.full_name || connection.username || 'Account';
                const content = (
                  <>
                    <Avatar className="h-11 w-11 shrink-0">
                      <AvatarImage src={connection.avatar_url || undefined} alt="" />
                      <AvatarFallback>{name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {connection.username ? `@${connection.username} · ` : ''}
                        Connected {formatDistanceToNow(new Date(connection.connected_at))} ago
                      </span>
                    </span>
                  </>
                );

                return (
                  <li key={connection.account_id}>
                    <div className="flex min-h-16 items-center gap-2 rounded-lg border border-border/60 bg-card/50 p-3">
                      {connection.username ? (
                        <Link
                          to={`/profile/${encodeURIComponent(connection.username)}`}
                          onClick={() => onOpenChange(false)}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-md transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
                      )}
                      {canManage && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove connection with ${name}`}
                          disabled={removingAccountId === connection.account_id}
                          onClick={() => void removeConnection(connection)}
                        >
                          {removingAccountId === connection.account_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          )}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
