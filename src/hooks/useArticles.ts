import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Article {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  image?: string;
  date: string;
  read_time: number;
  tags?: string[];
  author_name?: string;
  author_avatar?: string;
  external_url?: string;
  is_published: boolean;
  created_by?: string;
}

export const useArticles = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const fetchArticles = async () => {
    try {
      setLoading(true);
      
      // If user is authenticated, fetch all articles; otherwise, only published ones
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching articles:', error);
        toast.error('Failed to load articles');
        return;
      }

      setArticles(data || []);
    } catch (error) {
      console.error('Error fetching articles:', error);
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  const saveArticle = async (article: Partial<Article>) => {
    if (!user) {
      toast.error('You must be logged in to save articles');
      return false;
    }

    try {
      if (article.id) {
        // Update existing article
        const updateData = { ...article };
        delete updateData.id; // Remove id from update data
        
        const { error } = await supabase
          .from('articles')
          .update(updateData)
          .eq('id', article.id);

        if (error) throw error;
        toast.success('Article updated successfully');
      } else {
        // Create new article - ensure all required fields are present
        const insertData = {
          slug: article.slug || '',
          title: article.title || '',
          excerpt: article.excerpt || '',
          content: article.content || '',
          image: article.image,
          date: article.date || new Date().toISOString(),
          read_time: article.read_time || 5,
          tags: article.tags,
          author_name: article.author_name || 'Admin',
          author_avatar: article.author_avatar,
          external_url: article.external_url,
          is_published: article.is_published || false,
          created_by: user.id,
        };

        const { error } = await supabase
          .from('articles')
          .insert(insertData);

        if (error) throw error;
        toast.success('Article created successfully');
      }

      void fetchArticles(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error saving article:', error);
      toast.error('Failed to save article');
      return false;
    }
  };

  const deleteArticle = async (id: string) => {
    if (!user) {
      toast.error('You must be logged in to delete articles');
      return false;
    }

    try {
      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Article deleted successfully');
      void fetchArticles(); // Refresh the list
      return true;
    } catch (error) {
      console.error('Error deleting article:', error);
      toast.error('Failed to delete article');
      return false;
    }
  };

  const getArticleBySlug = (slug: string) => {
    return articles.find(article => article.slug === slug);
  };

  useEffect(() => {
    void fetchArticles();
  }, [user]);

  return {
    articles,
    loading,
    saveArticle,
    deleteArticle,
    getArticleBySlug,
    refetch: fetchArticles,
  };
};