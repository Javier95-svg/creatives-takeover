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
import { ArrowLeft, Calendar, Hash, Share2, Twitter, Linkedin, Facebook, Copy } from "lucide-react";
import { useStories, StoryArticle as StoryArticleType } from "@/hooks/useStories";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const StoryArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { fetchStoryBySlug } = useStories();
  const [article, setArticle] = useState<StoryArticleType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadArticle = async () => {
      if (!slug) return;
      
      setLoading(true);
      const data = await fetchStoryBySlug(slug);
      setArticle(data);
      setLoading(false);

      if (!data) {
        navigate("/stories", { replace: true });
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
  const ogImage = article.banner_image_url || "";

  return (
    <>
      <Helmet>
        <title>{metaTitle} | Creatives Takeover Stories</title>
        <meta name="description" content={metaDescription} />
        {article.hashtags && article.hashtags.length > 0 && (
          <meta name="keywords" content={article.hashtags.map(t => t.replace('#', '')).join(', ')} />
        )}

        {/* Open Graph */}
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${window.location.origin}/stories/${article.slug}`} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}

        <link rel="canonical" href={`/stories/${article.slug}`} />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="pt-16">
          {/* Banner Image - LinkedIn Style */}
          {article.banner_image_url && (
            <div className="w-full h-[400px] md:h-[500px] overflow-hidden bg-muted">
              <img
                src={article.banner_image_url}
                alt={article.title}
                className="w-full h-full object-cover"
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

            {/* Article Body - Markdown */}
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
          </article>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default StoryArticle;

