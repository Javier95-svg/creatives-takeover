import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  normalizeGuestWebsite,
  normalizeInstagramUrl,
  normalizeLinkedInUrl,
  parseYouTubeId,
} from '@/lib/podcast';

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  youtube_video_id: string;
  /** Slug of the mentor featured in this episode; empty when it is not an interview. */
  mentor_slug: string;
  /** Guest featured in this episode; empty when there is no guest. */
  guest_name: string;
  /** Absolute URL of the guest's project site; empty when unknown. */
  guest_website: string;
  /** Absolute URL of the guest's LinkedIn profile; empty when unknown. */
  guest_linkedin: string;
  /** Absolute URL of the guest's Instagram profile; empty when unknown. */
  guest_instagram: string;
  hashtags: string[];
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PodcastEpisodeInput {
  title: string;
  description: string;
  youtube_url: string;
  hashtags: string[];
  mentor_slug?: string;
  guest_name?: string;
  guest_website?: string;
  guest_linkedin?: string;
  guest_instagram?: string;
  is_published?: boolean;
}

const PODCAST_ADMIN_EMAIL = 'admin@creatives-takeover.com';

// podcast_episodes isn't in the generated Supabase types yet; cast through `any`
// (same pattern as the other freshly-added tables in this codebase).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from('podcast_episodes');

function mapRow(row: Record<string, unknown>): PodcastEpisode {
  return {
    id: String(row.id),
    title: typeof row.title === 'string' ? row.title : '',
    description: typeof row.description === 'string' ? row.description : '',
    youtube_url: typeof row.youtube_url === 'string' ? row.youtube_url : '',
    youtube_video_id: typeof row.youtube_video_id === 'string' ? row.youtube_video_id : '',
    hashtags: Array.isArray(row.hashtags) ? (row.hashtags as string[]) : [],
    mentor_slug: typeof row.mentor_slug === 'string' ? row.mentor_slug : '',
    guest_name: typeof row.guest_name === 'string' ? row.guest_name : '',
    guest_website: typeof row.guest_website === 'string' ? row.guest_website : '',
    guest_linkedin: typeof row.guest_linkedin === 'string' ? row.guest_linkedin : '',
    guest_instagram: typeof row.guest_instagram === 'string' ? row.guest_instagram : '',
    is_published: Boolean(row.is_published),
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  };
}

// The podcast is a chronological feed: an episode's upload time is its source
// of truth, rather than a manually assigned position.
function newestFirst(episodes: PodcastEpisode[]): PodcastEpisode[] {
  return [...episodes].sort((a, b) => {
    const newest = Date.parse(b.created_at) - Date.parse(a.created_at);
    return Number.isNaN(newest) ? 0 : newest;
  });
}

export function usePodcastEpisodes() {
  const { user } = useAuth();
  const isAdmin = user?.email?.toLowerCase() === PODCAST_ADMIN_EMAIL;

  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchEpisodes = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await table()
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEpisodes(Array.isArray(data) ? newestFirst(data.map(mapRow)) : []);
    } catch (error) {
      console.error('Error fetching podcast episodes:', error);
      setEpisodes([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchEpisodes();
  }, [fetchEpisodes]);

  const createEpisode = useCallback(
    async (input: PodcastEpisodeInput): Promise<PodcastEpisode | null> => {
      if (!isAdmin) {
        toast.error('Only the admin can add episodes');
        return null;
      }
      const videoId = parseYouTubeId(input.youtube_url);
      if (!videoId) {
        toast.error('Enter a valid YouTube link');
        return null;
      }
      setIsSaving(true);
      try {
        const payload = {
          title: input.title.trim(),
          description: input.description.trim(),
          youtube_url: input.youtube_url.trim(),
          youtube_video_id: videoId,
          hashtags: input.hashtags,
          mentor_slug: input.mentor_slug?.trim() || null,
          guest_name: input.guest_name?.trim() || null,
          guest_website: normalizeGuestWebsite(input.guest_website),
          guest_linkedin: normalizeLinkedInUrl(input.guest_linkedin),
          guest_instagram: normalizeInstagramUrl(input.guest_instagram),
          is_published: input.is_published ?? true,
        };
        const { data, error } = await table().insert([payload]).select().single();
        if (error) throw error;
        const created = mapRow(data);
        setEpisodes((prev) => newestFirst([created, ...prev]));
        toast.success('Episode published');
        return created;
      } catch (error) {
        console.error('Error creating podcast episode:', error);
        toast.error('Failed to publish episode');
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [isAdmin]
  );

  const updateEpisode = useCallback(
    async (id: string, input: PodcastEpisodeInput): Promise<PodcastEpisode | null> => {
      if (!isAdmin) {
        toast.error('Only the admin can edit episodes');
        return null;
      }
      const videoId = parseYouTubeId(input.youtube_url);
      if (!videoId) {
        toast.error('Enter a valid YouTube link');
        return null;
      }
      setIsSaving(true);
      try {
        const payload: Record<string, unknown> = {
          title: input.title.trim(),
          description: input.description.trim(),
          youtube_url: input.youtube_url.trim(),
          youtube_video_id: videoId,
          hashtags: input.hashtags,
          mentor_slug: input.mentor_slug?.trim() || null,
          guest_name: input.guest_name?.trim() || null,
          guest_website: normalizeGuestWebsite(input.guest_website),
          guest_linkedin: normalizeLinkedInUrl(input.guest_linkedin),
          guest_instagram: normalizeInstagramUrl(input.guest_instagram),
        };
        if (input.is_published !== undefined) payload.is_published = input.is_published;
        const { data, error } = await table().update(payload).eq('id', id).select().single();
        if (error) throw error;
        const updated = mapRow(data);
        setEpisodes((prev) => newestFirst(prev.map((ep) => (ep.id === id ? updated : ep))));
        toast.success('Episode updated');
        return updated;
      } catch (error) {
        console.error('Error updating podcast episode:', error);
        toast.error('Failed to update episode');
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [isAdmin]
  );

  const deleteEpisode = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isAdmin) {
        toast.error('Only the admin can delete episodes');
        return false;
      }
      try {
        const { error } = await table().delete().eq('id', id);
        if (error) throw error;
        setEpisodes((prev) => prev.filter((ep) => ep.id !== id));
        toast.success('Episode removed');
        return true;
      } catch (error) {
        console.error('Error deleting podcast episode:', error);
        toast.error('Failed to remove episode');
        return false;
      }
    },
    [isAdmin]
  );

  return {
    episodes,
    isLoading,
    isSaving,
    isAdmin,
    fetchEpisodes,
    createEpisode,
    updateEpisode,
    deleteEpisode,
  };
}
