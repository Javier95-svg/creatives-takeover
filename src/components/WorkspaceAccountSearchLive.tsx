import { messagingV2, mapRecipient } from '@/lib/messagingV2';
import { SocialButtons } from '@/components/social/SocialButtons';
import { AccountSearchField, type SearchAccount } from './WorkspaceAccountSearch';

async function searchAccounts(query: string, signal?: AbortSignal): Promise<SearchAccount[]> {
  // Use the exact lookup and mapping from Messages > + New, retaining server ordering.
  const rows = await messagingV2.recipients(query.trim(), 20, signal);
  return (rows ?? []).map(mapRecipient).map(recipient => ({
    id: recipient.userId,
    username: recipient.username,
    full_name: recipient.fullName,
    avatar_url: recipient.avatarUrl,
    headline: recipient.headline,
    isMentor: recipient.isMentor,
    isConnection: recipient.isConnection,
  }));
}

export default function WorkspaceAccountSearchLive() {
  return <AccountSearchField search={searchAccounts} renderActions={account =>
    <SocialButtons userId={account.id} userName={account.full_name || account.username || 'Founder'} profileActionsOnly showAccountabilityPartner={false} />
  } />;
}
