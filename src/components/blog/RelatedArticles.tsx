import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { BlogPost } from "@/types/blog";
import { Trend } from "@/hooks/useTrends";
import { useMemo } from "react";
import BookmarkButton from "./BookmarkButton";

interface RelatedArticlesProps {
  currentArticle: {
    id: string;
    tags?: string[];
    category?: string;
  };
  allArticles?: BlogPost[];
  allTrends?: Trend[];
  maxItems?: number;
}

const RelatedArticles = ({ 
  currentArticle, 
  allArticles = [], 
  allTrends = [],
  maxItems = 3 
}: RelatedArticlesProps) => {
  // Smart recommendation algorithm based on tags and category
  const relatedItems = useMemo(() => {
    const currentTags = currentArticle.tags?.map(t => t.toLowerCase()) || [];
    const currentCategory = currentArticle.category?.toLowerCase();

    // Combine articles and trends for recommendations
    const allItems = [
      ...allArticles.map(a => ({ 
        ...a, 
        type: 'article' as const,
        score: 0,
        matchedTags: [] as string[],
        category: a.tags?.[0] || '' // Use first tag as category for articles
      })),
      ...allTrends.map(t => ({ 
        id: t.id,
        title: t.title,
        excerpt: t.description || t.summary || '',
        tags: t.keywords || [],
        category: t.category,
        readTime: 5, // Default for trends
        date: t.created_at ? new Date(t.created_at).toLocaleDateString() : new Date().toLocaleDateString(),
        type: 'trend' as const,
        score: t.opportunity_score || 0,
        matchedTags: [] as string[]
      }))
    ];

    // Filter out current article and calculate relevance scores
    const scored = allItems
      .filter(item => item.id !== currentArticle.id)
      .map(item => {
        let relevanceScore = 0;
        const matchedTags: string[] = [];
        const itemTags = item.tags?.map(t => t.toLowerCase()) || [];
        const itemCategory = item.category?.toLowerCase();

        // Tag matching (highest weight)
        currentTags.forEach(tag => {
          if (itemTags.includes(tag)) {
            relevanceScore += 10;
            matchedTags.push(tag);
          }
        });

        // Category matching
        if (currentCategory && itemCategory === currentCategory) {
          relevanceScore += 5;
        }

        // Boost score for high-performing trends
        if (item.type === 'trend' && item.score > 70) {
          relevanceScore += 3;
        }

        return { ...item, relevanceScore, matchedTags };
      })
      .filter(item => item.relevanceScore > 0) // Only items with some relevance
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, maxItems);

    return scored;
  }, [currentArticle, allArticles, allTrends, maxItems]);

  if (relatedItems.length === 0) {
    return null;
  }

  return (
    <div className="mt-16 pt-12 border-t">
      <div className="flex items-center gap-2 mb-8">
        <TrendingUp className="w-5 h-5 text-primary" />
        <h2 className="text-2xl font-bold">Related Opportunities</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {relatedItems.map((item) => (
          <Card 
            key={item.id} 
            className="glass hover-lift group cursor-pointer relative overflow-hidden"
          >
            <Link 
              to={item.type === 'article' ? `/news/${item.id}` : '#'}
              onClick={item.type === 'trend' ? (e) => e.preventDefault() : undefined}
              className="block"
            >
              <CardContent className="p-5">
                {/* Bookmark Button */}
                <div className="absolute top-3 right-3 z-10">
                  <BookmarkButton postId={item.id} size="icon" />
                </div>

                {/* Tags with matched indicators */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {item.tags?.slice(0, 2).map((tag) => (
                    <Badge 
                      key={tag}
                      variant={item.matchedTags.includes(tag.toLowerCase()) ? "default" : "outline"}
                      className="text-xs"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {item.type === 'trend' && (
                    <Badge variant="secondary" className="text-xs">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      {item.score}
                    </Badge>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-lg font-bold mb-2 group-hover:gradient-text transition-all duration-300 line-clamp-2">
                  {item.title}
                </h3>
                
                {/* Excerpt */}
                <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                  {item.excerpt}
                </p>
                
                {/* Meta Info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{item.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{item.readTime} min</span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>

                {/* Relevance indicator */}
                {item.matchedTags.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      Matches: {item.matchedTags.join(', ')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RelatedArticles;
