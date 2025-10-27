/**
 * Dynamic Sitemap Generator
 * Generates XML sitemap with all routes, priorities, and change frequencies
 */

interface SitemapEntry {
  path: string;
  priority: number;
  changefreq: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  lastmod?: string;
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

export function generateSitemap(baseUrl: string = 'https://creatives-takeover.com'): string {
  const now = new Date().toISOString().split('T')[0];
  
  const urlEntries = routes.map(route => {
    const lastmod = route.lastmod || now;
    
    return `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq}</changefreq>
    <priority>${route.priority.toFixed(1)}</priority>
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

export function saveSitemap(): void {
  const sitemap = generateSitemap();
  console.log('Generated sitemap:');
  console.log(sitemap);
  console.log('\nTo save this sitemap, copy the above XML and save it to public/sitemap.xml');
}

// Export route list for other utilities
export { routes };
