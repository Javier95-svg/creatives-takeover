import { useEffect, useState, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, Hash, Share2, Twitter, Linkedin, Facebook, Copy } from "lucide-react";
import { useStories, StoryArticle as StoryArticleType } from "@/hooks/useStories";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// LinkedIn Embed Component
const LinkedInEmbed = ({ url }: { url: string }) => {
  const embedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load LinkedIn embed script
    const existingScript = document.querySelector('script[src="https://platform.linkedin.com/in.js"]');
    
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://platform.linkedin.com/in.js';
      script.type = 'text/javascript';
      script.async = true;
      script.innerHTML = 'lang: en_US';
      document.body.appendChild(script);
    }

    // Create embed script after LinkedIn script loads
    const timer = setTimeout(() => {
      if (embedRef.current) {
        // Clear any existing content
        embedRef.current.innerHTML = '';
        
        // Create the LinkedIn share embed script
        const embedScript = document.createElement('script');
        embedScript.type = 'IN/Share';
        embedScript.setAttribute('data-url', url);
        embedScript.setAttribute('data-counter', 'right');
        embedRef.current.appendChild(embedScript);
      }
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [url]);

  return (
    <div className="flex justify-center my-8">
      <div 
        className="linkedin-post-container w-full max-w-4xl"
        style={{ minHeight: '400px' }}
      >
        {/* LinkedIn Embed */}
        <div 
          className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900"
          style={{ 
            border: '1px solid #e0e0e0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}
        >
          <div ref={embedRef} className="min-h-[300px] flex items-center justify-center">
            {/* Fallback while loading */}
            <div className="p-8 text-center">
              <Linkedin className="w-16 h-16 mb-4 text-[#0077b5] mx-auto" />
              <h3 className="text-lg font-semibold mb-2">LinkedIn Post</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-md break-all">
                {url}
              </p>
              <Button asChild variant="default" size="lg">
                <a 
                  href={url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <Linkedin className="w-4 h-4" />
                  View on LinkedIn
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StoryArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { fetchStoryBySlug } = useStories();
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
        navigate("/stories", { replace: true });
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

  const sharePost = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    toast.success("Link copied to clipboard!");
  };

  const shareOnSocial = (platform: "twitter" | "linkedin" | "facebook") => {
    if (!article) return;
    
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(article.title);
    const description = encodeURIComponent(article.excerpt || article.title);

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

  const metaTitle = article.meta_title || article.title;
  const metaDescription = article.meta_description || article.excerpt || article.title;
  
  // Use LinkedIn OG image if available, otherwise fallback to banner or default
  const ogImage = linkedInOgImage || article.banner_image_url || "";
  const ogImageUrl = ogImage ? (ogImage.startsWith('http') ? ogImage : `${window.location.origin}${ogImage}`) : '';
  const articleUrl = `${window.location.origin}/stories/${article.slug}`;

  return (
    <>
      <Helmet>
        <title>{metaTitle} | Creatives Takeover Stories</title>
        <meta name="description" content={metaDescription} />
        {article.hashtags && article.hashtags.length > 0 && (
          <meta name="keywords" content={article.hashtags.map(t => t.replace('#', '')).join(', ')} />
        )}

        {/* Open Graph - Optimized for LinkedIn (1200x627 or 1920x1080) */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={articleUrl} />
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

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {ogImageUrl && <meta name="twitter:image" content={ogImageUrl} />}
        <meta name="twitter:image:alt" content={metaTitle} />

        <link rel="canonical" href={articleUrl} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="pt-16">
          {/* Banner Image - Full Width Above Title */}
          {article.banner_image_url && (
            <div className="w-full h-[400px] md:h-[500px] overflow-hidden bg-muted relative">
              <img
                src={article.banner_image_url}
                alt={article.title}
                className="w-full h-full object-cover"
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
            {/* Back Button */}
            <div className="mb-6">
              <Button variant="ghost" asChild>
                <Link to="/stories" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Stories
                </Link>
              </Button>
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
                      onClick={() => navigate(`/stories?tag=${encodeURIComponent(tag.replace('#', ''))}`)}
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
                <p className="text-xl text-muted-foreground mb-6 leading-relaxed">
                  {article.excerpt}
                </p>
              )}

              {/* Metadata */}
              <div className="flex items-center gap-6 mb-6 text-muted-foreground text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{fullDate}</span>
                </div>
                <span>•</span>
                <span>{timeAgo}</span>
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

            {/* Article Body - LinkedIn Embed or Markdown */}
            {article.linkedin_post_url ? (
              <div className="my-8">
                <LinkedInEmbed url={article.linkedin_post_url} />
              </div>
            ) : article.body_content ? (
              <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-headings:mt-8 prose-headings:mb-4 prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:font-bold prose-ul:list-disc prose-ol:list-decimal prose-blockquote:border-l-4 prose-blockquote:border-primary prose-blockquote:pl-4 prose-blockquote:italic prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-lg">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkBreaks]}
                  components={{
                    img: ({ node, ...props }) => (
                      <img
                        {...props}
                        className="rounded-lg my-4 max-w-full h-auto"
                        alt={props.alt || ""}
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
              </div>
            ) : (
              <div className="my-8 p-8 border border-dashed rounded-lg text-center text-muted-foreground">
                <p>No content available for this article.</p>
              </div>
            )}
          </article>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default StoryArticle;

