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

export const useStories = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Check if user is admin
  const isAdmin = user?.email?.toLowerCase() === 'admin@creatives-takeover.com';

  // Fetch all published stories (prioritize LinkedIn posts)
  const fetchStories = useCallback(async (hashtag?: string): Promise<StoryArticle[]> => {
    // #region agent log
    fetch('http://127.0.0.1:7256/ingest/dff1e4fd-d1e8-4642-a283-af6c327394f5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useStories.ts:46',message:'fetchStories entry',data:{hashtag,loadingState:loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
    try {
      setLoading(true);
      // #region agent log
      fetch('http://127.0.0.1:7256/ingest/dff1e4fd-d1e8-4642-a283-af6c327394f5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useStories.ts:51',message:'Before Supabase query',data:{hashtag},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      
      let query = supabase
        .from('stories_articles')
        .select('*')
        .eq('status', 'published')
        .not('linkedin_post_url', 'is', null) // Only fetch stories with LinkedIn URLs
        .order('published_at', { ascending: false });

      const queryStartTime = Date.now();
      const { data, error } = await query;
      const queryDuration = Date.now() - queryStartTime;
      // #region agent log
      fetch('http://127.0.0.1:7256/ingest/dff1e4fd-d1e8-4642-a283-af6c327394f5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useStories.ts:63',message:'After Supabase query',data:{hasError:!!error,errorCode:error?.code,errorMessage:error?.message,errorDetails:error?.details,errorHint:error?.hint,dataLength:data?.length,dataIsArray:Array.isArray(data),queryDuration},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion

      if (error) {
        // #region agent log
        fetch('http://127.0.0.1:7256/ingest/dff1e4fd-d1e8-4642-a283-af6c327394f5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useStories.ts:68',message:'Supabase query error thrown',data:{errorCode:error.code,errorMessage:error.message,errorDetails:error.details,errorHint:error.hint},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion
        throw error;
      }
      
      let stories = (data || []) as StoryArticle[];
      // #region agent log
      fetch('http://127.0.0.1:7256/ingest/dff1e4fd-d1e8-4642-a283-af6c327394f5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useStories.ts:72',message:'Stories parsed',data:{storiesCount:stories.length,storiesIsArray:Array.isArray(stories)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      // Case-insensitive tag filtering (client-side for better compatibility)
      if (hashtag) {
        const normalizedTag = normalizeHashtag(hashtag).toLowerCase();
        const beforeFilterCount = stories.length;
        stories = stories.filter((story) => {
          if (!story.hashtags || story.hashtags.length === 0) return false;
          return story.hashtags.some((tag) => 
            normalizeHashtag(tag).toLowerCase() === normalizedTag
          );
        });
        // #region agent log
        fetch('http://127.0.0.1:7256/ingest/dff1e4fd-d1e8-4642-a283-af6c327394f5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useStories.ts:82',message:'Tag filtering applied',data:{hashtag,beforeFilterCount,afterFilterCount:stories.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion
      }
      // #region agent log
      fetch('http://127.0.0.1:7256/ingest/dff1e4fd-d1e8-4642-a283-af6c327394f5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useStories.ts:85',message:'fetchStories success exit',data:{storiesCount:stories.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
      // #endregion

      return stories;
    } catch (error: any) {
      // #region agent log
      fetch('http://127.0.0.1:7256/ingest/dff1e4fd-d1e8-4642-a283-af6c327394f5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useStories.ts:90',message:'fetchStories error caught',data:{errorName:error?.name,errorMessage:error?.message,errorCode:error?.code,errorDetails:error?.details,errorHint:error?.hint,errorStack:error?.stack?.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
      // #endregion
      console.error('Error fetching stories:', error);
      toast.error('Failed to load stories');
      return [];
    } finally {
      setLoading(false);
      // #region agent log
      fetch('http://127.0.0.1:7256/ingest/dff1e4fd-d1e8-4642-a283-af6c327394f5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'useStories.ts:97',message:'fetchStories finally block',data:{loadingState:loading},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
    }
  }, [loading]);

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

