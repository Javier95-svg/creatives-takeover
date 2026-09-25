import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface Invitation { id: string; email: string; user_type: string; expires_at: string; revoked_at: string | null; claimed_by: string | null; last_emailed_at?: string | null; last_email_error?: string | null }

export function AccountInvitations() {
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('mentor');
  const [sendingId, setSendingId] = useState<string | null>(null);
  const client = useQueryClient();
  const invitations = useQuery({ queryKey: ['account-invitations'], queryFn: async () => {
    const { data, error } = await supabase.rpc('list_account_invitations' as never);
    if (error) throw error;
    return (Array.isArray(data) ? data : []) as unknown as Invitation[];
  }});
  const sendInvitation = async (invitationId: string) => {
    setSendingId(invitationId);
    try {
      const { data, error } = await supabase.functions.invoke('send-account-invitation', { body: { invitationId } });
      if (error || data?.sent !== true) throw new Error('Invitation email could not be sent. The invitation remains saved.');
      toast.success('Invitation email sent.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invitation email could not be sent.');
    } finally {
      setSendingId(null);
      void client.invalidateQueries({ queryKey: ['account-invitations'] });
    }
  };
  const manage = useMutation({ mutationFn: async (input: { email: string; category: string; revoke?: boolean }) => {
    const { data, error } = await supabase.rpc('manage_account_invitation' as never, {
      p_email: input.email.trim(), p_user_type: input.category, p_revoke: input.revoke ?? false,
    } as never);
    if (error) throw new Error(error.message);
    return String(data);
  }, onSuccess: (_data, input) => {
    if (input.revoke) toast.success('Invitation revoked.');
    else void sendInvitation(_data);
    void client.invalidateQueries({ queryKey: ['account-invitations'] });
  }, onError: (error) => toast.error(error instanceof Error ? error.message : 'Could not save invitation.') });

  return <section className="mb-8 rounded-xl border p-5" aria-labelledby="invitations-heading">
    <h2 id="invitations-heading" className="font-semibold">Mentor and marketplace invitations</h2>
    <p className="my-2 text-sm text-muted-foreground">Invite a person using their sign-in email. We send the onboarding link; they verify their email, answer the quiz, and receive your approval before category access opens.</p>
    <form className="my-4 flex flex-wrap items-end gap-3" onSubmit={event => { event.preventDefault(); manage.mutate({ email, category }); }}>
      <div><label htmlFor="invitation-email" className="text-sm">Sign-in email</label><Input id="invitation-email" type="email" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} /></div>
      <div><label htmlFor="invitation-category" className="block text-sm">Invitation for</label><select id="invitation-category" className="rounded border bg-background p-2" value={category} onChange={event => setCategory(event.target.value)}><option value="mentor">Mentorship</option><option value="marketplace">Marketplace services</option></select></div>
      <Button type="submit" disabled={manage.isPending}>Create or renew invitation</Button>
    </form>
    {invitations.isPending && <p>Loading invitations…</p>}
    {invitations.isError && <p role="alert">Could not load invitations. <button className="underline" onClick={() => void invitations.refetch()}>Retry</button></p>}
    <ul className="space-y-2">{(invitations.data ?? []).map(invitation => <li key={invitation.id} className="flex flex-wrap items-center gap-3 border-t pt-2 text-sm">
      <span>{invitation.email} · {invitation.user_type} · {invitation.revoked_at ? 'Revoked' : new Date(invitation.expires_at) <= new Date() ? 'Expired' : `Expires ${new Date(invitation.expires_at).toLocaleDateString()}`}{invitation.claimed_by ? ' · Request submitted' : ''}{invitation.last_emailed_at ? ` · Emailed ${new Date(invitation.last_emailed_at).toLocaleDateString()}` : ' · Email not sent'}{invitation.last_email_error ? ' · Delivery failed' : ''}</span>
      {!invitation.revoked_at && <Button size="sm" variant="outline" disabled={sendingId === invitation.id} onClick={() => void sendInvitation(invitation.id)}>{sendingId === invitation.id ? 'Sending…' : 'Resend email'}</Button>}
      {!invitation.revoked_at && <Button size="sm" variant="outline" disabled={manage.isPending} onClick={() => manage.mutate({ email: invitation.email, category: invitation.user_type, revoke: true })}>Revoke invitation</Button>}
    </li>)}</ul>
    <p className="mt-3 text-xs text-muted-foreground">Revoking prevents new requests and approval of pending requests. It does not suspend an already approved account.</p>
  </section>;
}
