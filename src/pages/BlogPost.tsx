import { useParams, Navigate } from "react-router-dom";
import SEO, { createArticleSchema, createBreadcrumbSchema } from "@/components/SEO";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ReadingProgress from "@/components/blog/ReadingProgress";
import RelatedArticles from "@/components/blog/RelatedArticles";
import BookmarkButton from "@/components/blog/BookmarkButton";
import { blogPosts } from "@/data/blogPosts";
import { useArticles } from "@/hooks/useArticles";
import { useTrends } from "@/hooks/useTrends";
import { Calendar, Clock, Share2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import DOMPurify from 'dompurify';


const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getArticleBySlug, loading } = useArticles();
  const { trends } = useTrends();
  const [post, setPost] = useState(null);
  const [readingComplete, setReadingComplete] = useState(false);

  useEffect(() => {
    if (!loading && slug) {
      // First check database articles
      const dbArticle = getArticleBySlug(slug);
      if (dbArticle) {
        setPost({
          id: dbArticle.id,
          slug: dbArticle.slug,
          title: dbArticle.title,
          excerpt: dbArticle.excerpt,
          content: dbArticle.content,
          image: dbArticle.image,
          date: new Date(dbArticle.date).toLocaleDateString(),
          readTime: dbArticle.read_time,
          tags: dbArticle.tags,
          author: {
            name: dbArticle.author_name || 'Admin',
            avatar: dbArticle.author_avatar,
          },
          externalUrl: dbArticle.external_url,
        });
      } else {
        // Fall back to static blog posts
        const staticPost = blogPosts.find(p => p.slug === slug);
        setPost(staticPost || null);
      }
    }
  }, [slug, getArticleBySlug, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading article...</p>
      </div>
    );
  }

  if (!post) {
    return <Navigate to="/insighta" replace />;
  }

  const sharePost = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copied to clipboard!");
    });
  };

  const shareOnSocial = (platform: string) => {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(post.title);
    const text = encodeURIComponent(post.excerpt);
    
    const shareUrls = {
      twitter: `https://twitter.com/intent/tweet?text=${title}&url=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
    };
    
    window.open(shareUrls[platform as keyof typeof shareUrls], '_blank');
  };

  const handleReadingComplete = () => {
    setReadingComplete(true);
    toast.success("Great read! Check out related opportunities below.");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${post.title} | Creatives Takeover`}
        description={post.excerpt}
        keywords={post.tags?.join(', ')}
        image={post.image}
        url={`/insighta/${post.slug}`}
        type="article"
        author={post.author?.name}
        publishedTime={post.date}
        modifiedTime={post.date}
        structuredData={[
          createArticleSchema({
            title: post.title,
            description: post.excerpt,
            image: post.image,
            author: post.author?.name || 'Creatives Takeover',
            publishedTime: post.date,
            modifiedTime: post.date,
            url: `/insighta/${post.slug}`,
            keywords: post.tags,
          }),
          createBreadcrumbSchema([
            { name: 'Home', url: '/' },
            { name: 'Blog', url: '/insighta' },
            { name: post.title, url: `/insighta/${post.slug}` },
          ]),
        ]}
      />
      
      <Navigation />

      {/* Reading Progress Bar */}
      <ReadingProgress 
        readTime={post.readTime} 
        onComplete={handleReadingComplete}
      />
      
      <main className="pt-header-offset pb-16">
        <article className="container mx-auto px-6 max-w-4xl">
          {/* Back Button */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="hover-lift">
              <Link to="/insighta" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Blog
              </Link>
            </Button>
          </div>

          {/* Article Header */}
          <header className="mb-12">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              {post.tags?.map((tag) => (
                <span 
                  key={tag}
                  className="px-3 py-1 text-sm rounded-full bg-muted text-muted-foreground border border-border"
                >
                  {tag}
                </span>
              ))}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold mb-6 gradient-text">
              {post.title}
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 leading-relaxed">
              {post.excerpt}
            </p>
            
            <div className="flex flex-wrap items-center gap-6 mb-8 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{post.date}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{post.readTime} min read</span>
              </div>
            </div>

            {/* Share Buttons */}
            <div className="flex flex-wrap items-center gap-3 pb-8 border-b border-border">
              <span className="text-sm font-medium">Share:</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={sharePost}
                className="flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                Copy Link
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => shareOnSocial('twitter')}
                className="text-blue-400 hover:text-blue-300"
              >
                Twitter
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => shareOnSocial('linkedin')}
                className="text-blue-600 hover:text-blue-500"
              >
                LinkedIn
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => shareOnSocial('facebook')}
                className="text-blue-700 hover:text-blue-600"
              >
                Facebook
              </Button>
              
              {/* Bookmark Button */}
              <div className="ml-auto">
                <BookmarkButton 
                  postId={post.id} 
                  showLabel 
                  variant="outline"
                />
              </div>
            </div>
          </header>

          {/* Featured Image */}
          {post.image && (
            <div className="mb-12 rounded-2xl overflow-hidden glass border border-border">
              <img 
                src={post.image} 
                alt={post.title}
                className="w-full h-64 md:h-96 object-cover"
              />
            </div>
          )}

          {/* Article Content */}
          <div 
            className="prose prose-lg max-w-none prose-headings:gradient-text prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-primary prose-code:bg-muted prose-code:px-1 prose-code:rounded"
            dangerouslySetInnerHTML={{ 
              __html: DOMPurify.sanitize(post.content, {
                ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a', 'img', 'blockquote', 'code', 'pre', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel']
              }) 
            }}
          />

          {/* Related Articles Section */}
          <RelatedArticles
            currentArticle={{
              id: post.id,
              tags: post.tags,
              category: post.tags?.[0], // Use first tag as category
            }}
            allArticles={blogPosts}
            allTrends={trends}
            maxItems={3}
          />
        </article>
      </main>
      
      <Footer />
    </div>
  );
};

export default BlogPost;