/**
 * RSS Feed Generator for Stories
 * Generates RSS 2.0 feed for story articles
 */

import { StoryArticle } from "@/hooks/useStories";

export interface RSSStory {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  guid: string;
  author?: string;
  category?: string[];
}

/**
 * Format date for RSS (RFC 822 format)
 */
function formatRSSDate(date: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const day = days[date.getUTCDay()];
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();
  const hours = date.getUTCHours().toString().padStart(2, '0');
  const minutes = date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = date.getUTCSeconds().toString().padStart(2, '0');
  
  return `${day}, ${date.getUTCDate().toString().padStart(2, '0')} ${month} ${year} ${hours}:${minutes}:${seconds} +0000`;
}

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate RSS feed XML from stories
 */
export function generateRSSFeed(
  stories: StoryArticle[],
  baseUrl: string = 'https://creatives-takeover.com'
): string {
  const now = new Date();
  const feedUrl = `${baseUrl}/stories/rss.xml`;
  const siteUrl = baseUrl;
  
  // Build RSS items
  const items = stories.map((story) => {
    const pubDate = story.published_at 
      ? new Date(story.published_at) 
      : new Date(story.created_at);
    
    const storyUrl = `${baseUrl}/stories/${story.slug}`;
    const description = escapeXML(story.excerpt || story.title || '');
    const title = escapeXML(story.title);
    
    // Build categories from hashtags
    const categories = (story.hashtags || [])
      .map(tag => escapeXML(tag.replace('#', '')));
    
    const categoryTags = categories.length > 0
      ? '\n' + categories.map(cat => `      <category>${cat}</category>`).join('\n')
      : '';
    
    return `    <item>
      <title>${title}</title>
      <link>${storyUrl}</link>
      <guid isPermaLink="true">${storyUrl}</guid>
      <description>${description}</description>
      <pubDate>${formatRSSDate(pubDate)}</pubDate>
      <author>admin@creatives-takeover.com (Creatives Takeover)</author>${categoryTags}
    </item>`;
  }).join('\n');
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Creatives Takeover Stories</title>
    <link>${siteUrl}/stories</link>
    <description>Expert stories, insights, and articles about entrepreneurship, startups, marketing, and business growth from Creatives Takeover.</description>
    <language>en-US</language>
    <lastBuildDate>${formatRSSDate(now)}</lastBuildDate>
    <pubDate>${formatRSSDate(now)}</pubDate>
    <ttl>60</ttl>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
    <image>
      <url>${baseUrl}/lovable-uploads/new-favicon.png</url>
      <title>Creatives Takeover Stories</title>
      <link>${siteUrl}/stories</link>
    </image>
${items}
  </channel>
</rss>`;
}

/**
 * Generate RSS feed and return as string
 * This should be called server-side or during build time
 */
export async function generateRSSFeedFromStories(
  stories: StoryArticle[],
  baseUrl: string = 'https://creatives-takeover.com'
): Promise<string> {
  // Sort stories by published date (newest first)
  const sortedStories = [...stories].sort((a, b) => {
    const dateA = a.published_at ? new Date(a.published_at) : new Date(a.created_at);
    const dateB = b.published_at ? new Date(b.published_at) : new Date(b.created_at);
    return dateB.getTime() - dateA.getTime();
  });
  
  // Limit to latest 50 stories for RSS feed
  const latestStories = sortedStories.slice(0, 50);
  
  return generateRSSFeed(latestStories, baseUrl);
}

