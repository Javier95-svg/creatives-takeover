import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { BlogPost } from "@/types/blog";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";

interface BlogCardProps {
  post: BlogPost;
  className?: string;
}

const BlogCard = ({ post, className = "" }: BlogCardProps) => {
  const { trackReadingEvent } = useReadingAnalytics();

  const handleCardClick = () => {
    trackReadingEvent({
      articleId: post.id,
      articleTitle: post.title,
      action: 'click',
      metadata: {
        tags: post.tags,
        readTime: post.readTime,
        externalUrl: post.externalUrl
      }
    });
  };

  return (
    <Card className={`glass hover-lift group cursor-pointer ${className}`}>
      <a 
        href={post.externalUrl || `/news/${post.slug}`} 
        className="block"
        target={post.externalUrl ? "_blank" : "_self"}
        rel={post.externalUrl ? "noopener noreferrer" : undefined}
        onClick={handleCardClick}
      >
        {/* Featured Image */}
        {post.image && (
          <div className="aspect-video overflow-hidden rounded-t-lg">
            <img 
              src={post.image} 
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        )}
        
        <CardContent className="p-6">
          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {post.tags.slice(0, 2).map((tag) => (
                <span 
                  key={tag}
                  className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {post.tags.length > 2 && (
                <span className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground">
                  +{post.tags.length - 2}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="text-xl font-bold mb-3 group-hover:gradient-text transition-all duration-300 line-clamp-2">
            {post.title}
          </h3>
          
          {/* Excerpt */}
          <p className="text-muted-foreground mb-4 line-clamp-3">
            {post.excerpt}
          </p>
          
          {/* Meta Info */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{post.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{post.readTime} min</span>
              </div>
            </div>
          </div>
          
          {/* Read More Button */}
          <Button 
            variant="ghost" 
            className="p-0 h-auto text-primary hover:text-primary/80 group/btn"
          >
            Read More 
            <ArrowRight className="w-4 h-4 ml-1 transition-transform group-hover/btn:translate-x-1" />
          </Button>
        </CardContent>
      </a>
    </Card>
  );
};

export default BlogCard;