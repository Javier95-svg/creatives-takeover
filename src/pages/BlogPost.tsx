import { useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { blogPosts } from "@/data/blogPosts";
import { useArticles } from "@/hooks/useArticles";
import { Calendar, Clock, Share2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const { getArticleBySlug, loading } = useArticles();
  const [post, setPost] = useState(null);

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
    return <Navigate to="/news" replace />;
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

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{post.title} - Creatives Takeover</title>
        <meta name="description" content={post.excerpt} />
        <meta name="keywords" content={post.tags?.join(', ')} />
        
        {/* Open Graph */}
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.excerpt} />
        <meta property="og:image" content={post.image} />
        <meta property="og:type" content="article" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.excerpt} />
        <meta name="twitter:image" content={post.image} />
      </Helmet>
      
      <Navigation />
      
      <main className="pt-24 pb-16">
        <article className="container mx-auto px-6 max-w-4xl">
          {/* Back Button */}
          <div className="mb-8">
            <Button variant="ghost" asChild className="hover-lift">
              <Link to="/news" className="flex items-center gap-2">
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
            <div className="flex items-center gap-3 pb-8 border-b border-border">
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
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </main>
      
      <Footer />
    </div>
  );
};

export default BlogPost;