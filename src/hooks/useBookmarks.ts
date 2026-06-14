import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface Bookmark {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
}

export const useBookmarks = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchBookmarks = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('user_bookmarks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookmarks(data || []);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addBookmark = async (postId: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to bookmark opportunities.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { error } = await supabase
        .from('user_bookmarks')
        .insert({
          user_id: user.id,
          post_id: postId
        });

      if (error) throw error;

      await fetchBookmarks();
      toast({
        title: "Bookmarked!",
        description: "Opportunity saved to your bookmarks.",
      });
      return true;
    } catch (error) {
      console.error('Error adding bookmark:', error);
      toast({
        title: "Error",
        description: "Failed to bookmark opportunity.",
        variant: "destructive",
      });
      return false;
    }
  };

  const removeBookmark = async (postId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId);

      if (error) throw error;

      await fetchBookmarks();
      toast({
        title: "Removed",
        description: "Opportunity removed from bookmarks.",
      });
      return true;
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast({
        title: "Error",
        description: "Failed to remove bookmark.",
        variant: "destructive",
      });
      return false;
    }
  };

  const isBookmarked = (postId: string) => {
    return bookmarks.some(bookmark => bookmark.post_id === postId);
  };

  const toggleBookmark = async (postId: string) => {
    if (isBookmarked(postId)) {
      return await removeBookmark(postId);
    } else {
      return await addBookmark(postId);
    }
  };

  useEffect(() => {
    if (user) {
      void fetchBookmarks();
    } else {
      setBookmarks([]);
    }
  }, [user]);

  return {
    bookmarks,
    isLoading,
    addBookmark,
    removeBookmark,
    isBookmarked,
    toggleBookmark,
    refetch: fetchBookmarks
  };
};