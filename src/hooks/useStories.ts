import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface StoryArticle {
  id: string;
  slug: string;
  title: string;
  banner_image_url: string | null;
  body_content: string;
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
  body_content: string;
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

  // Fetch all published stories
  const fetchStories = useCallback(async (hashtag?: string): Promise<StoryArticle[]> => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('stories_articles')
        .select('*')
        .eq('status', 'published')
        .order('published_at', { ascending: false });

      if (hashtag) {
        query = query.contains('hashtags', [hashtag]);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as StoryArticle[];
    } catch (error: any) {
      console.error('Error fetching stories:', error);
      toast.error('Failed to load stories');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Create new story (admin only)
  const createStory = useCallback(async (input: CreateStoryInput): Promise<StoryArticle | null> => {
    if (!isAdmin || !user) {
      toast.error('Only admins can create stories');
      return null;
    }

    try {
      setLoading(true);

      const storyData = {
        ...input,
        author_id: user.id,
        status: input.status || 'draft',
        hashtags: input.hashtags || [],
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

  // Upload banner image to Supabase Storage
  const uploadBannerImage = useCallback(async (file: File): Promise<string | null> => {
    if (!isAdmin || !user) {
      toast.error('Only admins can upload banner images');
      return null;
    }

    try {
      setLoading(true);

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `banners/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('story-banners')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('story-banners')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading banner image:', error);
      toast.error(error.message || 'Failed to upload banner image');
      return null;
    } finally {
      setLoading(false);
    }
  }, [isAdmin, user]);

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
  };
};

