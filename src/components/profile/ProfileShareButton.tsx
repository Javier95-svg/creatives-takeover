import { Copy, Linkedin, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { captureEvent } from '@/lib/analytics';
import { canUseNativeShare, getShareIntentUrl } from '@/lib/demoStudio/share';
import { founderIdShareUrl } from '@/lib/founderId';

interface Props {
  username: string;
  name: string;
  startupName: string | null;
  isOwnProfile: boolean;
  /** Founder and builder profiles are Founder IDs and share their short link. */
  founderId: boolean;
  /** 'chip' renders the "Share my Founder ID" ask in the support section. */
  variant?: 'button' | 'chip';
  className?: string;
}

type Channel = 'copy' | 'linkedin' | 'x' | 'native';

export const XIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/**
 * The share actions for a profile: copy the link, open LinkedIn or X, or the
 * device's share sheet. A Founder ID shares its short /@username link; either
 * way the link previews as the card served at /og/profile/:username. Shared by
 * the Share button and the Founder ID share prompts, which report their own
 * placement so analytics can tell which moment led to the share.
 */
export function useProfileShareActions({
  username,
  name,
  startupName,
  isOwnProfile,
  founderId,
  placement,
}: Omit<Props, 'variant' | 'className'> & { placement: string }) {
  const url = founderId ? founderIdShareUrl(username) : `${window.location.origin}/profile/${encodeURIComponent(username)}`;
  const text = startupName
    ? (isOwnProfile ? `Follow what I'm building with ${startupName}.` : `${name} is building ${startupName}.`)
    : (isOwnProfile ? "Follow what I'm building." : `${name} on Creatives Takeover.`);
  const projectName = startupName?.trim();
  const xText = founderId && isOwnProfile
    ? (projectName ? `Follow my journey building ${projectName}.` : 'Follow my journey building in public.')
    : text;

  const track = (channel: Channel) => captureEvent('profile_share_clicked', { channel, is_owner: isOwnProfile, placement });

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(founderId ? 'Founder ID link copied.' : 'Profile link copied.');
      track('copy');
    } catch {
      toast.error(`Copy this link: ${url}`);
    }
  };

  const openIntent = (channel: 'linkedin' | 'x') => {
    window.open(getShareIntentUrl(channel, url, channel === 'x' ? xText : text), '_blank', 'noopener,noreferrer');
    track(channel);
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: name, text, url });
      track('native');
    } catch {
      // The person closed the share sheet.
    }
  };

  return { url, copyLink, openIntent, nativeShare, canNativeShare: canUseNativeShare() };
}

export function ProfileShareButton({ username, name, startupName, isOwnProfile, founderId, variant = 'button', className }: Props) {
  const noun = founderId ? 'Founder ID' : 'profile';
  const share = useProfileShareActions({
    username,
    name,
    startupName,
    isOwnProfile,
    founderId,
    placement: variant === 'chip' ? 'support_section' : 'header',
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === 'chip' ? (
          <button type="button" className={className}>
            <Share2 className="h-4 w-4 text-primary" aria-hidden="true" />
            {founderId ? 'Share my Founder ID' : 'Share this profile'}
          </button>
        ) : (
          <Button variant="outline" size="sm" className={className}>
            <Share2 className="h-4 w-4 mr-2" />
            Share {noun}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="w-48">
        <DropdownMenuItem onSelect={() => void share.copyLink()}>
          <Copy className="h-4 w-4 mr-2" />
          Copy link
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => share.openIntent('linkedin')}>
          <Linkedin className="h-4 w-4 mr-2" />
          Share on LinkedIn
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => share.openIntent('x')}>
          <span className="mr-2"><XIcon /></span>
          Share on X
        </DropdownMenuItem>
        {share.canNativeShare && (
          <DropdownMenuItem onSelect={() => void share.nativeShare()}>
            <Share2 className="h-4 w-4 mr-2" />
            More options
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
