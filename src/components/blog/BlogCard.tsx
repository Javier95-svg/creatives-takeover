import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, Clock, ArrowRight, Eye, TrendingUp, Bookmark } from "lucide-react";
import { Link } from "react-router-dom";
import { BlogPost } from "@/types/blog";
import { useReadingAnalytics } from "@/hooks/useReadingAnalytics";
import { useBookmarks } from "@/hooks/useBookmarks";
import { useState } from "react";

interface BlogCardProps {
  post: BlogPost;
  className?: string;
}

const BlogCard = ({ post, className = "" }: BlogCardProps) => {
  const { trackReadingEvent } = useReadingAnalytics();
  const { isBookmarked, toggleBookmark } = useBookmarks();
  const [views] = useState(Math.floor(Math.random() * 500) + 100); // Mock views
  const [engagement] = useState(Math.floor(Math.random() * 50) + 10); // Mock engagement

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

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(post.id);
  };

  return (
    <Card className={`glass hover-lift group cursor-pointer relative overflow-hidden ${className}`}>
      <a 
        href={post.externalUrl || `/insighta/${post.slug}`} 
        className="block"
        target={post.externalUrl ? "_blank" : "_self"}
        rel={post.externalUrl ? "noopener noreferrer" : undefined}
        onClick={handleCardClick}
      >
        {/* Featured Image with Overlay Bookmark */}
        {post.image && (
          <div className="aspect-video overflow-hidden rounded-t-lg relative">
            <img 
              src={post.image} 
              alt={post.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <button
              onClick={handleBookmark}
              className="absolute top-3 right-3 p-2.5 min-h-[44px] min-w-[44px] bg-background/80 backdrop-blur-sm rounded-full hover:bg-background transition-colors z-10 flex items-center justify-center"
              aria-label="Bookmark article"
            >
              <Bookmark
                className={`w-4 h-4 ${isBookmarked(post.id) ? 'fill-primary text-primary' : 'text-muted-foreground'}`}
              />
            </button>
          </div>
        )}
        
        <CardContent className="p-6">
          {/* Category Badge + Tags */}
          <div className="flex flex-wrap gap-2 mb-3">
            {post.tags && post.tags.length > 0 && (
              <>
                <Badge variant="default" className="font-semibold">
                  {post.tags[0]}
                </Badge>
                {post.tags.slice(1, 3).map((tag) => (
                  <Badge 
                    key={tag}
                    variant="outline"
                    className="text-xs"
                  >
                    {tag}
                  </Badge>
                ))}
              </>
            )}
          </div>

          {/* Title */}
          <h3 className="text-xl font-bold mb-3 group-hover:gradient-text transition-all duration-300 line-clamp-2">
            {post.title}
          </h3>
          
          {/* Excerpt */}
          <p className="text-muted-foreground mb-4 line-clamp-2 text-sm leading-relaxed">
            {post.excerpt}
          </p>
          
          {/* Author Info */}
          {post.author && (
            <div className="flex items-center gap-2 mb-4 pb-4 border-b">
              <Avatar className="w-8 h-8">
                <AvatarImage src={post.author.avatar} />
                <AvatarFallback className="text-xs">
                  {post.author.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">{post.author.name}</span>
            </div>
          )}
          
          {/* Meta Info with Engagement */}
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                <span className="text-xs">{post.date}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs">{post.readTime} min</span>
              </div>
            </div>
          </div>

          {/* Engagement Metrics */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              <span>{views} views</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{engagement}% engagement</span>
            </div>
          </div>
          
          {/* Read More Button */}
          <Button 
            variant="ghost" 
            className="p-0 h-auto text-primary hover:text-primary/80 group/btn font-semibold"
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