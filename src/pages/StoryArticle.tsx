import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Hash, Share2, Twitter, Linkedin, Facebook, Copy, Edit } from "lucide-react";
import { useStories, StoryArticle as StoryArticleType } from "@/hooks/useStories";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createArticleSchema, createBreadcrumbSchema } from "@/components/SEO";
import { slugifyTag } from "@/utils/hashtagUtils";
import RelatedStories from "@/components/stories/RelatedStories";
import { LinkedInPostEmbed } from "@/components/stories/LinkedInPostEmbed";

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

    loadArticle();
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

  const shareOnSocial = (platform: "twitter" | "linkedin" | "facebook") => {
    if (!article) return;
    if (!requireAuthToShare()) return;

    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(article.title);

    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };

    window.open(shareUrls[platform], "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="pt-24 pb-16">
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

  // Optimize meta title - include primary keyword (first hashtag) if available
  const primaryTag = article.hashtags && article.hashtags.length > 0 
    ? article.hashtags[0].replace('#', '') 
    : '';
  const metaTitle = article.meta_title || article.title;
  const optimizedMetaTitle = primaryTag && !metaTitle.toLowerCase().includes(primaryTag.toLowerCase())
    ? `${metaTitle} | ${primaryTag}`
    : metaTitle;
  
  // Optimize meta description - ensure 150-160 characters, keyword-rich
  let metaDescription = article.meta_description || article.excerpt || article.title;
  if (metaDescription.length < 120) {
    // Enhance short descriptions
    const tagKeywords = article.hashtags?.slice(0, 2).map(t => t.replace('#', '')).join(', ') || '';
    metaDescription = tagKeywords 
      ? `${metaDescription} Learn about ${tagKeywords} and more from Creatives Takeover.`
      : `${metaDescription} Read insights and stories from Creatives Takeover.`;
  }
  // Ensure description is within optimal length (150-160 chars)
  if (metaDescription.length > 160) {
    metaDescription = metaDescription.substring(0, 157) + '...';
  } else if (metaDescription.length < 120) {
    metaDescription = metaDescription + ' Discover expert insights and actionable advice.';
    if (metaDescription.length > 160) {
      metaDescription = metaDescription.substring(0, 157) + '...';
    }
  }
  
  // Get primary hashtag for article:section
  const articleSection = primaryTag || 'General';
  
  // Use LinkedIn OG image if available, otherwise fallback to banner or default
  const ogImage = linkedInOgImage || article.banner_image_url || "";
  const ogImageUrl = ogImage ? (ogImage.startsWith('http') ? ogImage : `${window.location.origin}${ogImage}`) : '';
  const articleUrl = `${window.location.origin}/newspaper/${article.slug}`;

  return (
    <>
      <Helmet>
        <title>{optimizedMetaTitle} | Creatives Takeover Stories</title>
        <meta name="description" content={metaDescription} />
        {article.hashtags && article.hashtags.length > 0 && (
          <meta name="keywords" content={article.hashtags.map(t => t.replace('#', '')).join(', ')} />
        )}
        <meta name="author" content="Creatives Takeover" />

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
            {
              ...createArticleSchema({
                title: article.title,
                description: metaDescription,
                image: ogImageUrl || undefined,
                author: "Creatives Takeover",
                publishedTime: article.published_at ? new Date(article.published_at).toISOString() : new Date(article.created_at).toISOString(),
                modifiedTime: article.updated_at ? new Date(article.updated_at).toISOString() : undefined,
                url: `/newspaper/${article.slug}`,
                keywords: article.hashtags || [],
                articleSection: articleSection,
              }),
              "@id": `https://creatives-takeover.com/newspaper/${article.slug}`,
              "mainEntity": {
                "@type": "WebPage",
                "@id": `https://creatives-takeover.com/newspaper/${article.slug}`
              }
            },
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
              {/* Hashtags */}
              {article.hashtags && article.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
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

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold mb-4">{article.title}</h1>

              {/* Excerpt */}
              {article.excerpt && (
                <p className="text-xl text-muted-foreground mb-6 leading-relaxed excerpt">
                  {article.excerpt}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-6 mb-6 text-muted-foreground text-sm">
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
                  onClick={() => shareOnSocial("twitter")}
                  className="flex items-center gap-2 text-blue-400 hover:text-blue-300"
                >
                  <Twitter className="w-4 h-4" />
                  Twitter
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => shareOnSocial("linkedin")}
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-500"
                >
                  <Linkedin className="w-4 h-4" />
                  LinkedIn
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => shareOnSocial("facebook")}
                  className="flex items-center gap-2 text-blue-700 hover:text-blue-600"
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                </Button>
              </div>
            </header>

            {/* Article Body — in-platform Markdown is primary; the LinkedIn
                embed is only a fallback for articles without a body yet. */}
            {article.body_content ? (
              <section className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:font-bold prose-ul:list-disc prose-ol:list-decimal prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    img: ({ node, ...props }) => (
                      <img
                        {...props}
                        className="rounded-lg my-4 max-w-full h-auto"
                        alt={props.alt || article.title}
                        loading="lazy"
                      />
                    ),
                    a: ({ node, ...props }) => (
                      <a
                        {...props}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      />
                    ),
                  }}
                >
                  {article.body_content}
                </ReactMarkdown>
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

            {/* Related Stories Section */}
            <RelatedStories currentStory={article} limit={3} />

            {/* More from this topic - Link to tag pages */}
            {article.hashtags && article.hashtags.length > 0 && (
              <section className="mt-12 pt-8 border-t">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold mb-2">More from this topic</h2>
                  <p className="text-sm text-muted-foreground">
                    Explore more stories about these topics
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {article.hashtags.slice(0, 5).map((tag, index) => {
                    const tagSlug = slugifyTag(tag);
                    const tagDisplay = tag.replace('#', '');
                    return (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/newspaper/tags/${tagSlug}`)}
                        className="flex items-center gap-2"
                      >
                        <Hash className="w-3 h-3" />
                        {tagDisplay}
                      </Button>
                    );
                  })}
                </div>
              </section>
            )}
          </article>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default StoryArticle;

