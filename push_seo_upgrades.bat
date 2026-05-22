@echo off
cd /d "%~dp0"

echo Removing stale git lock if present...
if exist ".git\index.lock" del /f ".git\index.lock"

echo.
echo Staging SEO upgrade files...
git add src/components/SEO.tsx
git add src/pages/FounderAnswerPage.tsx
git add src/pages/StartupGuide.tsx
git add src/App.tsx
git add public/sitemap.xml
git add public/llms.txt
git add index.html
git add src/components/stories/StoryCard.tsx
git add vercel.json

echo.
echo Committing...
git commit -m "seo: 4 search engine upgrades — HowTo schema, pillar page, CWV fixes, caching

- src/components/SEO.tsx: added createHowToSchema() helper — generates HowTo JSON-LD
  with numbered steps + per-step anchors for Google rich results
- src/pages/FounderAnswerPage.tsx: wired createHowToSchema into all 14 /answers/* pages
  using existing sections data — each page now emits Breadcrumb + HowTo + FAQ + Article schema
- src/pages/StartupGuide.tsx: new pillar page at /startup-guide targeting 'how to build a startup'
  — covers all 5 clusters (ICP, Validation, Build, Launch, Fundraising), links all 14 cluster
  pages, includes HowTo + FAQ + Article structured data, full SEO meta
- src/App.tsx: registered /startup-guide route with lazy import
- public/sitemap.xml: added /startup-guide at priority 0.9
- public/llms.txt: added /startup-guide to public_pages
- index.html: CWV fixes — Google Fonts converted to async preload (LCP fix),
  added preconnect for Amplitude CDN, dns-prefetch for ContentSquare + Umami
- src/components/stories/StoryCard.tsx: added loading=lazy + decoding=async to banner images
- vercel.json: added browser caching headers — assets/ immutable 1yr, HTML no-cache,
  static files 24hr stale-while-revalidate"

echo.
echo Pushing to GitHub (Vercel will auto-deploy)...
git push

echo.
echo Done! Check Vercel dashboard for deployment status.
echo New page live at: https://creatives-takeover.com/startup-guide
echo Validate schema at: https://search.google.com/test/rich-results
echo Test caching at: https://pagespeed.web.dev/report?url=https://creatives-takeover.com
pause
