/**
 * Dynamic Sitemap Generator
 * Generates XML sitemap with all routes, priorities, and change frequencies
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { logError } from '@/lib/logger';

interface SitemapEntry {
  path: string;
  priority: number;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  lastmod?: string;
}

export interface StorySitemapEntry {
  slug: string;
  published_at: string | null;
  updated_at: string | null;
}

export interface TagSitemapEntry {
  tag: string;
  lastmod: string;
}

const routes: SitemapEntry[] = [
  // Homepage - Highest Priority
  { path: '/', priority: 1.0, changefreq: 'daily' },
  
  // Main Product Pages - Very High Priority
  { path: '/bizmap-ai', priority: 0.9, changefreq: 'weekly' },
  { path: '/pricing', priority: 0.9, changefreq: 'weekly' },
  { path: '/services', priority: 0.9, changefreq: 'weekly' },
  
  // Community & Content - High Priority
  { path: '/insighta', priority: 0.8, changefreq: 'daily' },
  { path: '/community', priority: 0.8, changefreq: 'daily' },
  { path: '/resources', priority: 0.8, changefreq: 'weekly' },
  
  // Information Pages - Medium-High Priority
  { path: '/about', priority: 0.7, changefreq: 'monthly' },
  { path: '/faq', priority: 0.7, changefreq: 'weekly' },
  { path: '/contact', priority: 0.7, changefreq: 'monthly' },
  
  // User Features - Medium Priority
  { path: '/dashboard', priority: 0.6, changefreq: 'daily' },
  { path: '/accountability', priority: 0.6, changefreq: 'weekly' },
  { path: '/messages', priority: 0.6, changefreq: 'daily' },
  { path: '/profile', priority: 0.6, changefreq: 'weekly' },
  { path: '/account', priority: 0.6, changefreq: 'monthly' },
  
  // Demo & Tools
  { path: '/demo', priority: 0.6, changefreq: 'weekly' },
  { path: '/demo-calls', priority: 0.6, changefreq: 'weekly' },
  { path: '/collaboration-demo', priority: 0.6, changefreq: 'monthly' },
  { path: '/phase4-collaboration-demo', priority: 0.6, changefreq: 'monthly' },
  { path: '/prompt-library', priority: 0.6, changefreq: 'weekly' },
  { path: '/laboratory', priority: 0.6, changefreq: 'weekly' },
  
  // Special Pages
  { path: '/creatives-takeover', priority: 0.7, changefreq: 'weekly' },
  { path: '/software', priority: 0.7, changefreq: 'monthly' },
  { path: '/careers', priority: 0.6, changefreq: 'monthly' },
  { path: '/subscription-success', priority: 0.5, changefreq: 'never' },
  
  // Legal Pages
  { path: '/terms', priority: 0.4, changefreq: 'yearly' },
  { path: '/privacy-policy', priority: 0.4, changefreq: 'yearly' },
  { path: '/ip-policy', priority: 0.4, changefreq: 'yearly' },
  
  // Admin Pages - Lower Priority (will be disallowed in robots.txt anyway)
  { path: '/admin/tools', priority: 0.3, changefreq: 'monthly' },
  { path: '/admin/analytics', priority: 0.3, changefreq: 'monthly' },
  { path: '/admin/feedback', priority: 0.3, changefreq: 'monthly' },
  { path: '/admin/gamification', priority: 0.3, changefreq: 'monthly' },
  { path: '/admin/job-applications', priority: 0.3, changefreq: 'monthly' },
];

/**
 * Generate sitemap entries for story articles
 */
export function generateStoryEntries(
  stories: StorySitemapEntry[],
  baseUrl: string = 'https://creatives-takeover.com'
): string {
  return stories.map(story => {
    const lastmod = story.updated_at || story.published_at || new Date().toISOString().split('T')[0];
    const formattedLastmod = new Date(lastmod).toISOString().split('T')[0];
    
    return `  <url>
    <loc>${baseUrl}/newspaper/${story.slug}</loc>
    <lastmod>${formattedLastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  }).join('\n');
}

/**
 * Generate sitemap entries for tag archive pages
 */
export function generateTagEntries(
  tags: TagSitemapEntry[],
  baseUrl: string = 'https://creatives-takeover.com'
): string {
  // Import slugifyTag here to avoid circular dependencies
  const slugifyTag = (tag: string): string => {
    let slug = tag.replace(/^#+/, '').trim().toLowerCase();
    slug = slug.replace(/[\s_]+/g, '-');
    slug = slug.replace(/[^a-z0-9-]/g, '');
    slug = slug.replace(/-+/g, '-');
    slug = slug.replace(/^-+|-+$/g, '');
    return slug;
  };

  return tags.map(tagEntry => {
    const tagSlug = slugifyTag(tagEntry.tag);
    const formattedLastmod = new Date(tagEntry.lastmod).toISOString().split('T')[0];
    
    return `  <url>
    <loc>${baseUrl}/newspaper/tags/${tagSlug}</loc>
    <lastmod>${formattedLastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join('\n');
}

export function generateSitemap(
  baseUrl: string = 'https://creatives-takeover.com',
  stories?: StorySitemapEntry[],
  tags?: TagSitemapEntry[]
): string {
  const now = new Date().toISOString().split('T')[0];
  
  // Generate static route entries
  const staticEntries = routes.map(route => {
    const lastmod = route.lastmod || now;
    
    return `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`;
  });

  // Add Stories listing page
  staticEntries.push(`  <url>
    <loc>${baseUrl}/newspaper</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);

  // Generate dynamic story entries
  const storyEntries = stories ? generateStoryEntries(stories, baseUrl) : '';
  
  // Generate dynamic tag entries
  const tagEntries = tags ? generateTagEntries(tags, baseUrl) : '';

  // Combine all entries
  const allEntries = [
    ...staticEntries,
    ...(storyEntries ? [storyEntries] : []),
    ...(tagEntries ? [tagEntries] : [])
  ].filter(Boolean).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries}
</urlset>`;
}

export function saveSitemap(
  stories?: StorySitemapEntry[],
  tags?: TagSitemapEntry[]
): void {
  const sitemap = generateSitemap('https://creatives-takeover.com', stories, tags);
  // Note: This function is typically used in build scripts, so console.log is acceptable here
  // for direct output to stdout
  console.log('Generated sitemap:');
  console.log(sitemap);
  console.log('\nTo save this sitemap, copy the above XML and save it to public/sitemap.xml');
}

/**
 * Helper function to fetch stories and tags for sitemap generation
 * This should be called server-side or during build time
 */
export async function fetchSitemapData(supabaseClient: SupabaseClient): Promise<{
  stories: StorySitemapEntry[];
  tags: TagSitemapEntry[];
}> {
  try {
    // Fetch all published stories
    const { data: stories, error: storiesError } = await supabaseClient
      .from('stories_articles')
      .select('slug, published_at, updated_at')
      .eq('status', 'published')
      .not('linkedin_post_url', 'is', null)
      .order('published_at', { ascending: false });

    if (storiesError) throw storiesError;

    // Fetch all stories to extract unique hashtags with lastmod
    const { data: allStories, error: allStoriesError } = await supabaseClient
      .from('stories_articles')
      .select('hashtags, published_at, updated_at')
      .eq('status', 'published')
      .not('linkedin_post_url', 'is', null);

    if (allStoriesError) throw allStoriesError;

    // Extract tags and find latest article date for each tag
    const tagLastMod = new Map<string, string>();
    
      (allStories || []).forEach((story: StorySitemapEntry) => {
      if (story.hashtags && Array.isArray(story.hashtags)) {
        const lastmod = story.updated_at || story.published_at || new Date().toISOString();
        
        story.hashtags.forEach((tag: string) => {
          const normalized = tag.toLowerCase().replace(/^#+/, '#');
          const currentLastmod = tagLastMod.get(normalized);
          
          if (!currentLastmod || new Date(lastmod) > new Date(currentLastmod)) {
            tagLastMod.set(normalized, lastmod);
          }
        });
      }
    });

    const tags: TagSitemapEntry[] = Array.from(tagLastMod.entries()).map(([tag, lastmod]) => ({
      tag,
      lastmod: new Date(lastmod).toISOString().split('T')[0]
    }));

    return {
      stories: (stories || []).map((s: StorySitemapEntry) => ({
        slug: s.slug,
        published_at: s.published_at,
        updated_at: s.updated_at
      })),
      tags
    };
  } catch (error) {
    logError('Error fetching sitemap data', error);
    return { stories: [], tags: [] };
  }
}

// Export route list for other utilities
export { routes };
