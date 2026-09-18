import { lazy, Suspense } from 'react';
import { hasApplicationConfig } from '@/lib/hasApplicationConfig';
import { ProfilePhoto } from '@/components/workspace/ProfilePhoto';

const LiveAvatar = lazy(() => import('./WorkspaceProfileAvatarLive'));

// Re-exported so the existing callers keep working. New callers that only need
// the picture should import it from components/workspace/ProfilePhoto instead,
// which carries no reference to the Live variant.
export { ProfilePhoto };

export default function WorkspaceProfileAvatar() {
  return hasApplicationConfig
    ? <Suspense fallback={<ProfilePhoto initials="…" />}><LiveAvatar /></Suspense>
    : <ProfilePhoto />;
}
