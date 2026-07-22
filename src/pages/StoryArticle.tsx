import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Hash, Linkedin, Facebook, Copy, Edit, ExternalLink } from "lucide-react";
import { XIcon } from "@/components/icons/XIcon";
import { useStories, StoryArticle as StoryArticleType } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createArticleSchema, createBreadcrumbSchema } from "@/components/SEO";
import { slugifyTag } from "@/utils/hashtagUtils";
import RelatedStories from "@/components/stories/RelatedStories";
import { LinkedInPostEmbed } from "@/components/stories/LinkedInPostEmbed";
import { ArticleBody } from "@/components/stories/ArticleBody";
import { extractArticleCitations } from "@/lib/articleCitations";
import { SITE_IDENTITY } from "@/config/siteIdentity";

const StoryArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { fetchStoryBySlug } = useStories();
  const { user } = useAuth();
  const [article, setArticle] = useState<StoryArticleType | null>(null);
  const [loading, setLoading] = useState(true);
  const [linkedInOgImage, setLinkedInOgImage] = useState<string | null>(null);

  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) return;
      
      setLoading(true);
      const data = await fetchStoryBySlug(slug);
      setArticle(data);
      setLoading(false);

      if (!data) {
        navigate("/newspaper", { replace: true });
        return;
      }

      // Fetch LinkedIn post metadata if LinkedIn URL exists
      if (data.linkedin_post_url) {
        try {
          const { data: metadata, error } = await supabase.functions.invoke('fetch-linkedin-metadata', {
            body: { linkedinUrl: data.linkedin_post_url },
          });

          if (!error && metadata?.ogImage) {
            setLinkedInOgImage(metadata.ogImage);
          }
        } catch (error) {
          console.error('Error fetching LinkedIn metadata:', error);
          // Silently fail - will use fallback image
        }
      }
    };

    void loadArticle();
  }, [slug, fetchStoryBySlug, navigate]);

  // Sharing is reserved for signed-in users. Guests see the buttons but are
  // routed to sign in / create an account first (returning here afterwards).
  const requireAuthToShare = (): boolean => {
    if (user) return true;
    toast.info("Create a free account to share this article.");
    navigate(`/login?redirect=${encodeURIComponent(`/newspaper/${slug ?? ""}`)}`);
    return false;
  };

  const sharePost = () => {
    if (!requireAuthToShare()) return;
    const url = window.location.href;
    void navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const shareOnSocial = (platform: "x" | "linkedin" | "facebook") => {
    if (!article) return;
    if (!requireAuthToShare()) return;

    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(article.title);

    const shareUrls = {
      x: `https://x.com/intent/tweet?text=${title}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };

    window.open(shareUrls[platform], "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-header-offset pb-16">
          <div className="container mx-auto px-6 max-w-4xl">
            <div className="text-center py-16">
              <p className="text-muted-foreground">Loading article...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!article) {
    return null;
  }

  const publishedDate = article.published_at
    ? new Date(article.published_at)
    : new Date(article.created_at);
  const timeAgo = formatDistanceToNow(publishedDate, { addSuffix: true });
  const fullDate = publishedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Calculate reading time (average reading speed: 200 words per minute)
  const calculateReadingTime = (content: string | null): number => {
    if (!content) return 3; // Default 3 minutes for LinkedIn posts
    const words = content.split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return Math.max(1, minutes); // Minimum 1 minute
  };
  const readingTime = calculateReadingTime(article.body_content || article.excerpt);

  // Prefer the editor-authored title. Do not append hashtags or mechanically
  // truncate: the publishing editor exposes the final length before release.
  const primaryTag = article.hashtags && article.hashtags.length > 0 
    ? article.hashtags[0].replace('#', '') 
    : '';
  const metaTitle = (article.meta_title || article.title).trim();
  const optimizedMetaTitle = metaTitle.toLowerCase().includes("creatives takeover")
    ? metaTitle
    : `${metaTitle} | Creatives Takeover`;
  
  const metaDescription = (article.meta_description || article.excerpt || article.title).trim();
  
  // Get primary hashtag for article:section
  const articleSection = primaryTag || 'General';
  
  // Use LinkedIn OG image if available, otherwise fallback to banner or default
  const ogImage = linkedInOgImage || article.banner_image_url || "";
  const ogImageUrl = ogImage ? (ogImage.startsWith('http') ? ogImage : `${window.location.origin}${ogImage}`) : '';
  const articleUrl = `${window.location.origin}/newspaper/${article.slug}`;
  const citations = extractArticleCitations(article.body_content);
  const articleSchema = {
    ...createArticleSchema({
      title: article.title,
      description: metaDescription,
      image: ogImageUrl || undefined,
      author: SITE_IDENTITY.name,
      publishedTime: article.published_at ? new Date(article.published_at).toISOString() : new Date(article.created_at).toISOString(),
      modifiedTime: article.updated_at && article.updated_at !== article.created_at
        ? new Date(article.updated_at).toISOString()
        : undefined,
      url: `/newspaper/${article.slug}`,
      keywords: article.hashtags || [],
      articleSection,
    }),
    "@id": `${SITE_IDENTITY.baseUrl}/newspaper/${article.slug}`,
    author: {
      "@type": "Organization",
      "@id": `${SITE_IDENTITY.baseUrl}/#organization`,
      name: `${SITE_IDENTITY.name} Editorial Team`,
      url: `${SITE_IDENTITY.baseUrl}/about`,
    },
    mainEntity: {
      "@type": "WebPage",
      "@id": `${SITE_IDENTITY.baseUrl}/newspaper/${article.slug}`,
    },
    ...(citations.length ? { citation: citations.map((citation) => citation.url) } : {}),
  };

  return (
    <>
      <Helmet>
        <title>{optimizedMetaTitle}</title>
        <meta name="description" content={metaDescription} />
        {article.hashtags && article.hashtags.length > 0 && (
          <meta name="keywords" content={article.hashtags.map(t => t.replace('#', '')).join(', ')} />
        )}
        <meta name="author" content="Creatives Takeover Editorial Team" />

        {/* Open Graph - Optimized for LinkedIn (1200x627 or 1920x1080) */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={optimizedMetaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={articleUrl} />
        <meta property="article:section" content={articleSection} />
        <meta property="article:author" content="Creatives Takeover" />
        <meta property="article:publisher" content="Creatives Takeover" />
        {ogImageUrl && (
          <>
            <meta property="og:image" content={ogImageUrl} />
            <meta property="og:image:secure_url" content={ogImageUrl} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="627" />
            <meta property="og:image:alt" content={metaTitle} />
            <meta property="og:image:type" content="image/jpeg" />
          </>
        )}
        <meta property="og:site_name" content="Creatives Takeover" />
        <meta property="og:locale" content="en_US" />
        {article.published_at && (
          <meta property="article:published_time" content={new Date(article.published_at).toISOString()} />
        )}
        {article.updated_at && (
          <meta property="article:modified_time" content={new Date(article.updated_at).toISOString()} />
        )}
        {/* Open Graph Article Tags - Add each hashtag as article:tag (up to 10 for optimal social sharing) */}
        {article.hashtags && article.hashtags.length > 0 && (
          article.hashtags.slice(0, 10).map((tag, index) => (
            <meta key={index} property="article:tag" content={tag.replace('#', '')} />
          ))
        )}

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={optimizedMetaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}
        <meta name="twitter:image:alt" content={optimizedMetaTitle} />
        <meta name="twitter:site" content="@CreativesTakeover" />
        <meta name="twitter:creator" content="@CreativesTakeover" />

        <link rel="canonical" href={articleUrl} />
        {article.linkedin_post_url && (
          <link rel="alternate" href={article.linkedin_post_url} type="text/html" />
        )}

        {/* Structured Data (JSON-LD) */}
        <script type="application/ld+json">
          {JSON.stringify([
            articleSchema,
            createBreadcrumbSchema([
              { name: 'Home', url: '/' },
              { name: 'Stories', url: '/newspaper' },
              { name: article.title, url: `/newspaper/${article.slug}` }
            ]),
            // ImageObject schema for banner image
            ...(ogImageUrl ? [{
              "@context": "https://schema.org",
              "@type": "ImageObject",
              "url": ogImageUrl,
              "contentUrl": ogImageUrl,
              "caption": article.title,
              "description": metaDescription,
            }] : []),
            // Speakable schema for voice search
            {
              "@context": "https://schema.org",
              "@type": "SpeakableSpecification",
              "cssSelector": ["h1", ".excerpt"]
            }
          ])}
        </script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />

        {/* pt clears the fixed navbar (h-16 mobile / 70px desktop) so it sits
            above the page but never covers the banner thumbnail. */}
        <main className="pt-16 md:pt-[70px]">
          {/* Banner Image - Full Width Above Title */}
          {article.banner_image_url && (
            <div className="w-full h-[340px] sm:h-[420px] md:h-[500px] overflow-hidden bg-muted relative">
              <img
                src={article.banner_image_url}
                alt={article.excerpt || article.title}
                className="w-full h-full object-cover"
                loading="eager"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Article Content - Centered */}
          <article className="container mx-auto px-6 max-w-4xl py-8">
            {/* Back Button and Admin Edit Button */}
            <div className="mb-6 flex items-center justify-between">
              <Button variant="ghost" asChild>
                <Link to="/newspaper" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Stories
                </Link>
              </Button>
              {user?.email?.toLowerCase() === "admin@creatives-takeover.com" && article && (
                <Button
                  variant="outline"
                  onClick={() => navigate(`/newspaper/admin/edit/${article.id}`)}
                  className="flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Article
                </Button>
              )}
            </div>

            {/* Article Header */}
            <header className="mb-8">
              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{article.title}</h1>

              {/* Hashtags */}
              {article.hashtags && article.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {article.hashtags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="cursor-pointer"
                      onClick={() => {
                        const tagSlug = slugifyTag(tag);
                        navigate(`/newspaper/tags/${tagSlug}`);
                      }}
                    >
                      <Hash className="w-3 h-3 mr-1" />
                      {tag.replace('#', '')}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Excerpt */}
              {article.excerpt && (
                <p className="text-xl text-muted-foreground mb-6 leading-relaxed excerpt">
                  {article.excerpt}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-6 mb-6 text-muted-foreground text-sm">
                <span>
                  By <Link to="/about" className="font-medium text-foreground underline-offset-4 hover:underline">Creatives Takeover Editorial Team</Link>
                </span>
                <span aria-hidden="true">•</span>
                <time dateTime={publishedDate.toISOString()} className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{fullDate}</span>
                </time>
                <span>•</span>
                <span>{timeAgo}</span>
                <span>•</span>
                <span>{readingTime} min read</span>
              </div>

              {/* Share Buttons */}
              <div className="flex flex-wrap items-center gap-3 pb-6 border-b border-border">
                <span className="text-sm font-medium">Share:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={sharePost}
                  className="flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Copy Link
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => shareOnSocial("x")}
                  className="flex items-center gap-2 text-foreground hover:text-foreground/80"
                >
                  <XIcon className="w-4 h-4" />
                  X
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => shareOnSocial("linkedin")}
                  className="flex items-center gap-2 text-info hover:text-info"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => shareOnSocial("facebook")}
                  className="flex items-center gap-2 text-info hover:text-info"
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Button>
              </div>
            </header>

            {/* Article Body — in-platform Markdown is primary; the LinkedIn
                embed is only a fallback for articles without a body yet. */}
            {article.body_content ? (
              <section className="mt-2">
                <ArticleBody content={article.body_content} title={article.title} />
              </section>
            ) : article.linkedin_post_url ? (
              <div className="my-8">
                <LinkedInPostEmbed
                  url={article.linkedin_post_url}
                  title={article.title}
                  excerpt={article.excerpt ?? undefined}
                  hashtags={article.hashtags}
                />
              </div>
            ) : (
              <div className="my-8 p-8 border border-dashed rounded-lg text-center text-muted-foreground">
                <p>No content available for this article.</p>
              </div>
            )}

            {citations.length > 0 && (
              <section className="my-10 rounded-2xl border border-border bg-muted/30 p-6" aria-labelledby="article-sources-heading">
                <h2 id="article-sources-heading" className="text-2xl font-semibold tracking-tight">Sources</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  External references linked in this article, collected here for verification and further reading.
                </p>
                <ul className="mt-5 space-y-3">
                  {citations.map((citation) => (
                    <li key={citation.url}>
                      <a
                        href={citation.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-start justify-between gap-4 rounded-xl border border-border/70 bg-background p-4 text-sm transition-colors hover:border-primary/40"
                      >
                        <span>
                          <span className="block font-semibold text-foreground">{citation.title}</span>
                          <span className="mt-1 block text-muted-foreground">{citation.publisher}</span>
                        </span>
                        <ExternalLink className="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Related Stories Section */}
            <RelatedStories currentStory={article} limit={4} />
          </article>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default StoryArticle;
