import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { parseYouTubeId } from '@/lib/podcast';

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;
  youtube_url: string;
  youtube_video_id: string;
  hashtags: string[];
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface PodcastEpisodeInput {
  title: string;
  description: string;
  youtube_url: string;
  hashtags: string[];
  is_published?: boolean;
  sort_order?: number;
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
    sort_order: typeof row.sort_order === 'number' ? row.sort_order : 0,
    is_published: Boolean(row.is_published),
    created_at: typeof row.created_at === 'string' ? row.created_at : '',
    updated_at: typeof row.updated_at === 'string' ? row.updated_at : '',
  };
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
        .order('sort_order', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEpisodes(Array.isArray(data) ? data.map(mapRow) : []);
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
          is_published: input.is_published ?? true,
          sort_order: input.sort_order ?? Date.now() % 2_000_000_000,
        };
        const { data, error } = await table().insert([payload]).select().single();
        if (error) throw error;
        const created = mapRow(data);
        setEpisodes((prev) => [created, ...prev]);
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
        };
        if (input.is_published !== undefined) payload.is_published = input.is_published;
        if (input.sort_order !== undefined) payload.sort_order = input.sort_order;

        const { data, error } = await table().update(payload).eq('id', id).select().single();
        if (error) throw error;
        const updated = mapRow(data);
        setEpisodes((prev) => prev.map((ep) => (ep.id === id ? updated : ep)));
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
