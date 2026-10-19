import { Link } from 'react-router-dom';
import { IdCard } from 'lucide-react';
import { ProfileShareButton } from './ProfileShareButton';

/**
 * The top of a Founder ID, with its sharing action beside the public label.
 */
export function FounderIdHeader({ username, name, startupName, isOwnProfile }: { username: string; name: string; startupName: string | null; isOwnProfile: boolean }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
        <IdCard className="h-3.5 w-3.5" aria-hidden="true" />
        Founder ID
      </span>
      <div className="flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2">
        {isOwnProfile && (
          <Link to="/account" className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground">
            Change link
          </Link>
        )}
        <ProfileShareButton
          username={username}
          name={name}
          startupName={startupName}
          isOwnProfile={isOwnProfile}
          founderId
        />
      </div>
    </div>
  );
}
