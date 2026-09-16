import { lazy, Suspense, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { hasApplicationConfig } from '@/lib/hasApplicationConfig';

const LiveAvatar = lazy(() => import('./WorkspaceProfileAvatarLive'));

export function ProfilePhoto({ sources = [], initials = '?' }: { sources?: string[]; initials?: string }) {
  const [failed, setFailed] = useState<string[]>([]);
  const src = sources.find(source => source && !failed.includes(source));
  return <Avatar className="h-9 w-9">
    <AvatarImage key={src} src={src} alt="Your profile photo" onLoadingStatusChange={status => {
      if (status === 'error' && src) setFailed(previous => [...previous, src]);
    }} />
    <AvatarFallback className="bg-primary text-xs font-medium text-primary-foreground">{initials}</AvatarFallback>
  </Avatar>;
}

export default function WorkspaceProfileAvatar() {
  return hasApplicationConfig
    ? <Suspense fallback={<ProfilePhoto initials="…" />}><LiveAvatar /></Suspense>
    : <ProfilePhoto />;
}
