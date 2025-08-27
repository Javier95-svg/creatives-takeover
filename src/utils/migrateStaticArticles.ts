import { supabase } from '@/integrations/supabase/client';
import { blogPosts } from '@/data/blogPosts';
import { Article } from '@/hooks/useArticles';

export const migrateStaticArticlesToDatabase = async (userId: string): Promise<boolean> => {
  try {
    // First, check if articles are already migrated
    const { data: existingArticles } = await supabase
      .from('articles')
      .select('slug')
      .in('slug', blogPosts.map(post => post.slug));

    const existingSlugs = existingArticles?.map(article => article.slug) || [];
    
    // Filter out articles that are already migrated
    const articlesToMigrate = blogPosts.filter(post => !existingSlugs.includes(post.slug));
    
    if (articlesToMigrate.length === 0) {
      console.log('All static articles have already been migrated');
      return true;
    }

    // Transform static blog posts to database format
    const articleData: Omit<Article, 'id'>[] = articlesToMigrate.map(post => ({
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      content: post.content,
      image: post.image || '',
      date: post.date,
      read_time: post.readTime,
      tags: post.tags || [],
      author_name: post.author?.name || 'Creatives Takeover Team',
      author_avatar: post.author?.avatar,
      external_url: post.externalUrl,
      is_published: true,
      created_by: userId,
    }));

    // Insert articles into database
    const { error } = await supabase
      .from('articles')
      .insert(articleData);

    if (error) {
      console.error('Migration error:', error);
      return false;
    }

    console.log(`Successfully migrated ${articlesToMigrate.length} articles to database`);
    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
};