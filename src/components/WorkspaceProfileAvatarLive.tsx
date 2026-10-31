import { useAuth } from '@/contexts/AuthContext';
import { useWorkspaceAccount } from '@/hooks/useWorkspaceAccount';
import { ProfilePhoto } from './WorkspaceProfileAvatar';

export default function WorkspaceProfileAvatarLive() {
  const { user } = useAuth();
  const { data: profile } = useWorkspaceAccount();
  const metadata = user?.user_metadata;
  const sources = [profile?.avatar_url, metadata?.avatar_url, metadata?.picture,
    ...(user?.identities ?? []).flatMap(identity => [identity.identity_data?.avatar_url, identity.identity_data?.picture])]
    .filter((source): source is string => typeof source === 'string' && Boolean(source.trim()));
  const name = profile?.full_name || profile?.username || metadata?.full_name || metadata?.name || 'Account';
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <ProfilePhoto key={user?.id ?? 'guest'} sources={sources} initials={initials} />;
}
