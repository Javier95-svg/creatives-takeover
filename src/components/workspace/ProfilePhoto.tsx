import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/**
 * Split out of WorkspaceProfileAvatar so a caller can render the avatar without
 * pulling in that module, whose body holds a lazy reference to the Live variant
 * and therefore to the auth context and the database client. The anonymous tour
 * at /demo needs the picture and must not reach either.
 */
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
