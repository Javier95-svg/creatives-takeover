import { toast } from 'sonner';
import { postPath } from '@/lib/launchpadTopics';

export async function copyPostLink(id: string) {
  try {
    await navigator.clipboard.writeText(`${window.location.origin}${postPath(id)}`);
    toast.success('Link copied.');
  } catch {
    toast.error('Could not copy the link.');
  }
}
