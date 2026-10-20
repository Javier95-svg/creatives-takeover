import { Play } from 'lucide-react';
import { getPostLinks, getPostYouTubeId } from '@/lib/postLinks';
import { LinkedPostText } from '@/components/social/LinkedPostText';

interface Props {
  content: string;
  onPlayVideo: (videoId: string) => void;
}

export function PostContent({ content, onPlayVideo }: Props) {
  const links = getPostLinks(content);
  const videoId = links.map((link) => getPostYouTubeId(link.href)).find(Boolean);

  return <>
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
      <LinkedPostText content={content} />
    </p>
    {videoId && (
      <button
        type="button"
        onClick={() => onPlayVideo(videoId)}
        aria-label="Play shared YouTube video"
        className="group relative block aspect-video w-full overflow-hidden rounded-lg border border-border bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <img src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`} alt="Shared YouTube video preview" loading="lazy" className="h-full w-full object-contain" />
        <span className="absolute inset-0 flex items-center justify-center bg-black/15 transition-colors group-hover:bg-black/30">
          <span className="flex h-14 w-20 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg"><Play className="h-7 w-7 fill-current" aria-hidden="true" /></span>
        </span>
        <span className="absolute bottom-3 left-3 rounded bg-black/75 px-3 py-1 text-xs font-medium text-white">Play YouTube video</span>
      </button>
    )}
  </>;
}
