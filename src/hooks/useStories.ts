import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { normalizeHashtag } from '@/utils/hashtagUtils';

export interface StoryArticle {
  id: string;
  slug: string;
  title: string;
  banner_image_url: string | null;
  body_content: string | null;
  linkedin_post_url: string | null;
  excerpt: string | null;
  hashtags: string[];
  author_id: string;
  status: 'draft' | 'published';
  published_at: string | null;
  meta_title: string | null;
  meta_description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateStoryInput {
  slug: string;
  title: string;
  banner_image_url?: string | null;
  body_content?: string | null;
  linkedin_post_url?: string | null;
  excerpt?: string | null;
  hashtags?: string[];
  meta_title?: string | null;
  meta_description?: string | null;
  status?: 'draft' | 'published';
}

const getStoryReleaseTimestamp = (story: Pick<StoryArticle, 'published_at' | 'created_at'>) => {
  return new Date(story.published_at ?? story.created_at).getTime();
};

const sortStoriesByReleaseDate = (stories: StoryArticle[]) => {
  return [...stories].sort((a, b) => getStoryReleaseTimestamp(b) - getStoryReleaseTimestamp(a));
};

export const useStories = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Check if user is admin
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';

  // Fetch all published stories (prioritize LinkedIn posts)
  const fetchStories = useCallback(async (hashtag?: string): Promise<StoryArticle[]> => {
    try {
      setLoading(true);
      
      const query = supabase
        .from('stories_articles')
        .select('*')
        .eq('status', 'published')
        .not('linkedin_post_url', 'is', null) // Only fetch stories with LinkedIn URLs
        .order('published_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      
      let stories = (data || []) as StoryArticle[];

      // Case-insensitive tag filtering (client-side for better compatibility)
      if (hashtag) {
        const normalizedTag = normalizeHashtag(hashtag).toLowerCase();
        stories = stories.filter((story) => {
          if (!story.hashtags || story.hashtags.length === 0) return false;
          return story.hashtags.some((tag) => 
            normalizeHashtag(tag).toLowerCase() === normalizedTag
          );
        });
      }

      return sortStoriesByReleaseDate(stories);
    } catch (error: any) {
      console.error('Error fetching stories:', error);
      toast.error('Failed to load stories');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Search published stories by title, excerpt, slug, and hashtags
  const searchStories = useCallback(async (query: string): Promise<StoryArticle[]> => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return fetchStories();
    }

    try {
      setLoading(true);

      const escapedQuery = trimmedQuery.replace(/[%_]/g, '');
      const likePattern = `%${escapedQuery}%`;
      const normalizedHashtag = normalizeHashtag(trimmedQuery);
      const queryWithoutHash = trimmedQuery.replace(/^#+/, '').toLowerCase();

      const baseSelect = () =>
        supabase
          .from('stories_articles')
          .select('*')
          .eq('status', 'published')
          .not('linkedin_post_url', 'is', null);

      const [titleRes, excerptRes, slugRes, hashtagRes] = await Promise.all([
        baseSelect().ilike('title', likePattern).order('published_at', { ascending: false }),
        baseSelect().ilike('excerpt', likePattern).order('published_at', { ascending: false }),
        baseSelect().ilike('slug', likePattern).order('published_at', { ascending: false }),
        baseSelect().contains('hashtags', [normalizedHashtag]).order('published_at', { ascending: false }),
      ]);

      const errors = [titleRes.error, excerptRes.error, slugRes.error, hashtagRes.error].filter(Boolean);
      if (errors.length > 0) {
        throw errors[0];
      }

      const merged = new Map<string, StoryArticle>();
      [titleRes.data, excerptRes.data, slugRes.data, hashtagRes.data].forEach((collection) => {
        (collection || []).forEach((story) => {
          merged.set(story.id, story as StoryArticle);
        });
      });

      const stories = Array.from(merged.values());

      const ranked = stories.sort((a, b) => {
        const score = (story: StoryArticle) => {
          const title = (story.title || '').toLowerCase();
          const excerpt = (story.excerpt || '').toLowerCase();
          const slug = (story.slug || '').toLowerCase();
          const tags = (story.hashtags || []).map((tag) => normalizeHashtag(tag).toLowerCase());
          const normalizedQueryLower = normalizedHashtag.toLowerCase();

          let relevance = 0;

          if (title.includes(queryWithoutHash)) relevance += 8;
          if (excerpt.includes(queryWithoutHash)) relevance += 5;
          if (slug.includes(queryWithoutHash)) relevance += 4;
          if (tags.some((tag) => tag === normalizedQueryLower)) relevance += 9;
          if (tags.some((tag) => tag.includes(queryWithoutHash))) relevance += 4;

          const published = new Date(getStoryReleaseTimestamp(story));
          const ageInDays = Math.max(0, (Date.now() - published.getTime()) / (1000 * 60 * 60 * 24));
          const recencyBoost = Math.max(0, 2 - ageInDays / 180);

          return relevance + recencyBoost;
        };

        const scoreDiff = score(b) - score(a);
        if (scoreDiff !== 0) return scoreDiff;

        return getStoryReleaseTimestamp(b) - getStoryReleaseTimestamp(a);
      });

      return ranked;
    } catch (error: any) {
      console.error('Error searching stories:', error);
      toast.error('Failed to search stories');
      return [];
    } finally {
      setLoading(false);
    }
  }, [fetchStories]);

  // Fetch single story by slug
  const fetchStoryBySlug = useCallback(async (slug: string): Promise<StoryArticle | null> => {
    try {
      setLoading(true);
      
      // Build query - admin can see drafts, others only published
      let query = supabase
        .from('stories_articles')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      if (!isAdmin) {
        query = query.eq('status', 'published');
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as StoryArticle | null;
    } catch (error: any) {
      console.error('Error fetching story:', error);
      toast.error('Failed to load story');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch single story by ID (admin only)
  const fetchStoryById = useCallback(async (id: string): Promise<StoryArticle | null> => {
    if (!isAdmin) {
      toast.error('Only admins can fetch stories by ID');
      return null;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('stories_articles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as StoryArticle | null;
    } catch (error: any) {
      console.error('Error fetching story by ID:', error);
      toast.error('Failed to load story');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch all drafts (admin only)
  const fetchDrafts = useCallback(async (): Promise<StoryArticle[]> => {
    if (!isAdmin) {
      toast.error('Only admins can view drafts');
      return [];
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('stories_articles')
        .select('*')
        .eq('status', 'draft')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return (data || []) as StoryArticle[];
    } catch (error: any) {
      console.error('Error fetching drafts:', error);
      toast.error('Failed to load drafts');
      return [];
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Upload banner image (admin only)
  const uploadBannerImage = useCallback(async (
    file: File,
    articleId?: string
  ): Promise<string | null> => {
    if (!isAdmin) {
      toast.error('Only admins can upload banner images');
      return null;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.');
      return null;
    }

    // Validate file size (5MB = 5242880 bytes)
    const maxSize = 5242880;
    if (file.size > maxSize) {
      toast.error('File size exceeds 5MB limit. Please upload a smaller image.');
      return null;
    }

    try {
      setLoading(true);

      // Generate file path: {article_id}/{timestamp}.{ext} or temp/{timestamp}.{ext}
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = articleId 
        ? `${articleId}/${timestamp}.${fileExt}`
        : `temp/${timestamp}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('story-banners')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('story-banners')
        .getPublicUrl(fileName);

      toast.success('Banner image uploaded successfully');
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading banner image:', error);
      toast.error(error.message || 'Failed to upload banner image');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Create new story (admin only)
  const createStory = useCallback(async (input: CreateStoryInput): Promise<StoryArticle | null> => {
    if (!isAdmin || !user) {
      toast.error('Only admins can create stories');
      return null;
    }

    // Validate LinkedIn URL is required
    if (!input.linkedin_post_url) {
      toast.error('LinkedIn post URL is required');
      return null;
    }

    try {
      setLoading(true);

      const storyData = {
        ...input,
        author_id: user.id,
        status: input.status || 'draft',
        published_at: input.status === 'published' ? new Date().toISOString() : null,
        hashtags: input.hashtags || [],
        linkedin_post_url: input.linkedin_post_url, // Required
        banner_image_url: input.banner_image_url || null,
        body_content: null, // Not used for LinkedIn posts
      };

      const { data, error } = await supabase
        .from('stories_articles')
        .insert(storyData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Story created successfully');
      return data as StoryArticle;
    } catch (error: any) {
      console.error('Error creating story:', error);
      toast.error(error.message || 'Failed to create story');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user]);

  // Update story (admin only)
  const updateStory = useCallback(async (
    id: string,
    input: Partial<CreateStoryInput>
  ): Promise<StoryArticle | null> => {
    if (!isAdmin) {
      toast.error('Only admins can update stories');
      return null;
    }

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('stories_articles')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      toast.success('Story updated successfully');
      return data as StoryArticle;
    } catch (error: any) {
      console.error('Error updating story:', error);
      toast.error(error.message || 'Failed to update story');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Delete story (admin only)
  const deleteStory = useCallback(async (id: string): Promise<boolean> => {
    if (!isAdmin) {
      toast.error('Only admins can delete stories');
      return false;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from('stories_articles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Story deleted successfully');
      return true;
    } catch (error: any) {
      console.error('Error deleting story:', error);
      toast.error(error.message || 'Failed to delete story');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Fetch all unique hashtags with counts
  const fetchUniqueHashtags = useCallback(async (): Promise<Array<{ tag: string; count: number }>> => {
    try {
      setLoading(true);
      
      // Fetch all published stories
      const { data, error } = await supabase
        .from('stories_articles')
        .select('hashtags')
        .eq('status', 'published')
        .not('linkedin_post_url', 'is', null);

      if (error) throw error;

      // Count hashtag occurrences
      const tagCounts = new Map<string, number>();
      
      (data || []).forEach((story: { hashtags: string[] | null }) => {
        if (story.hashtags && Array.isArray(story.hashtags)) {
          story.hashtags.forEach((tag) => {
            // Normalize tag for consistent counting
            const normalized = normalizeHashtag(tag);
            if (normalized) {
              const currentCount = tagCounts.get(normalized) || 0;
              tagCounts.set(normalized, currentCount + 1);
            }
          });
        }
      });

      // Convert to array and sort by count (descending)
      const tagArray = Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

      return tagArray;
    } catch (error: any) {
      console.error('Error fetching unique hashtags:', error);
      toast.error('Failed to load hashtags');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    isAdmin,
    fetchStories,
    searchStories,
    fetchStoryBySlug,
    fetchStoryById,
    fetchDrafts,
    createStory,
    updateStory,
    deleteStory,
    uploadBannerImage,
    fetchUniqueHashtags,
  };
};

