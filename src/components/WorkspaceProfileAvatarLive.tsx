import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ProfilePhoto } from './WorkspaceProfileAvatar';

export default function WorkspaceProfileAvatarLive() {
  const { user } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['workspace-profile-avatar', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.schema('public').from('profiles').select('avatar_url, full_name, username').eq('id', user!.id).abortSignal(signal).maybeSingle();
      if (error) throw error;
      return data;
    },
    staleTime: 0,
  });
  const metadata = user?.user_metadata;
  const sources = [profile?.avatar_url, metadata?.avatar_url, metadata?.picture,
    ...(user?.identities ?? []).flatMap(identity => [identity.identity_data?.avatar_url, identity.identity_data?.picture])]
    .filter((source): source is string => typeof source === 'string' && Boolean(source.trim()));
  const name = profile?.full_name || profile?.username || metadata?.full_name || metadata?.name || 'Account';
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <ProfilePhoto key={user?.id ?? 'guest'} sources={sources} initials={initials} />;
}
