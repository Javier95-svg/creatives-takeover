@echo off
cd /d "%~dp0"

echo Removing stale git lock if present...
if exist ".git\index.lock" del /f ".git\index.lock"

echo.
echo Staging all SEO changes...
git add index.html
git add public/sitemap.xml
git add public/llms.txt
git add public/index.legacy.html
git add CT_Keyword_Map.xlsx
git add src/pages/Index.tsx
git add src/pages/NotFound.tsx
git add src/pages/About.tsx
git add src/pages/Contact.tsx
git add src/pages/Services.tsx
git add src/pages/community/MentorMarketplaceHub.tsx

echo.
echo Committing...
git commit -m "seo: technical foundation fixes + quick wins

- index.html: keyword-optimised title, OG/Twitter tags, 4-block JSON-LD schema (WebSite/Org/SoftwareApp/FAQPage), enriched SEO fallback
- src/pages/Index.tsx: React Helmet title, description, keywords aligned to founder search intent
- src/pages/community/MentorMarketplaceHub.tsx: replaced bare Helmet with full SEO component + Service schema on /mentorship
- src/pages/NotFound.tsx: added noindex,nofollow to stop 404 crawl budget waste
- src/pages/About.tsx, Contact.tsx, Services.tsx: og:image updated from favicon to og-image.png
- public/sitemap.xml: lastmod dates updated, /answers/* priority bumped to 0.8
- public/llms.txt: expanded from 7 to 40+ public routes for AI search engine discoverability
- public/index.html: renamed to index.legacy.html (removes ghost page from Vite build)"

echo.
echo Pushing to GitHub (Vercel will auto-deploy)...
git push

echo.
echo Done! Check Vercel dashboard for deployment status.
echo Then validate schema at: https://search.google.com/test/rich-results
pause
