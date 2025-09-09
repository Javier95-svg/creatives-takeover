import React from "react";
import PostCard, { Post } from "./PostCard";

interface PostMasonryProps {
  posts: Post[];
}

const PostMasonry: React.FC<PostMasonryProps> = ({ posts }) => {
  // Enhanced post sizing logic based on engagement and content
  const getPostSize = (post: Post, index: number) => {
    const hasHighEngagement = post.votes > 10 || post.commentsCount > 5;
    const hasLongContent = post.content.length > 500;
    const hasAIInsights = post.aiSummary || (post.aiInsights && post.aiInsights.length > 0);
    const isRecent = new Date(post.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Featured post logic (first high-engagement post gets larger size)
    if (index === 0 && hasHighEngagement) {
      return "featured";
    }
    
    // Large posts for high engagement or rich content
    if (hasHighEngagement || (hasLongContent && hasAIInsights)) {
      return "large";
    }
    
    // Medium posts for AI-enhanced content or recent posts
    if (hasAIInsights || isRecent || hasLongContent) {
      return "medium";
    }
    
    return "small";
  };

  const getSizeClasses = (size: string) => {
    switch (size) {
      case "featured":
        return "md:col-span-2 md:row-span-2";
      case "large":
        return "lg:col-span-1 md:row-span-2";
      case "medium":
        return "md:col-span-1 md:row-span-1";
      default:
        return "col-span-1 row-span-1";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-min">
      {posts.map((post, index) => {
        const size = getPostSize(post, index);
        const sizeClasses = getSizeClasses(size);
        
        return (
          <div 
            key={post.id} 
            className={`${sizeClasses} animate-fade-in`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <PostCard post={post} />
          </div>
        );
      })}
    </div>
  );
};

export default PostMasonry;