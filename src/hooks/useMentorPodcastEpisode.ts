import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MentorPodcastEpisode {
  id: string;
  title: string;
  description: string;
  youtubeVideoId: string;
}

/**
 * The published podcast episode featuring this mentor, or null.
 *
 * Joined on podcast_episodes.mentor_slug, which holds the same slug the profile
 * route uses. Failures resolve to null rather than surfacing an error: the
 * episode banner is an enhancement, and a mentor profile must still render
 * without it.
 */
export function useMentorPodcastEpisode(mentorSlug: string | null | undefined) {
  const [episode, setEpisode] = useState<MentorPodcastEpisode | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(mentorSlug));

  useEffect(() => {
    if (!mentorSlug) {
      setEpisode(null);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const load = async () => {
      try {
        // podcast_episodes is not in the generated Supabase types yet — same
        // `any` cast the podcast hook uses.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from('podcast_episodes')
          .select('id, title, description, youtube_video_id')
          .eq('mentor_slug', mentorSlug)
          .eq('is_published', true)
          .order('sort_order', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (error || !data?.youtube_video_id) {
          setEpisode(null);
          return;
        }

        setEpisode({
          id: String(data.id),
          title: typeof data.title === 'string' ? data.title : '',
          description: typeof data.description === 'string' ? data.description : '',
          youtubeVideoId: String(data.youtube_video_id),
        });
      } catch {
        if (!cancelled) setEpisode(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [mentorSlug]);

  return { episode, isLoading };
}
