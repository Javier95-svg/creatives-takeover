import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, MapPin, Activity, Lightbulb, Users, DollarSign, CheckCircle, ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Trend } from "@/hooks/useTrends";
import { useTrends } from "@/hooks/useTrends";
import { cn } from "@/lib/utils";
import { useMemo } from "react";
import BookmarkButton from "./BookmarkButton";

interface TrendCardProps {
  trend: Trend;
  onClick?: () => void;
  showRelated?: boolean;
}

const TrendCard = ({ trend, onClick, showRelated = false }: TrendCardProps) => {
  const navigate = useNavigate();
  const { trends } = useTrends();

  // Find related opportunities based on shared tags/keywords
  const relatedOpportunities = useMemo(() => {
    if (!showRelated) return [];
    
    const trendKeywords = trend.keywords?.map(k => k.toLowerCase()) || [];
    const trendCategory = trend.category?.toLowerCase();

    return trends
      .filter(t => t.id !== trend.id)
      .map(t => {
        let score = 0;
        const tKeywords = t.keywords?.map(k => k.toLowerCase()) || [];
        
        // Keyword matching
        trendKeywords.forEach(keyword => {
          if (tKeywords.includes(keyword)) score += 2;
        });

        // Category matching
        if (t.category?.toLowerCase() === trendCategory) score += 1;

        return { trend: t, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map(item => item.trend);
  }, [trend, trends, showRelated]);

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 3) return 'text-green-600 bg-green-50';
    if (difficulty <= 6) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getDifficultyLabel = (difficulty: number) => {
    if (difficulty <= 3) return 'Easy';
    if (difficulty <= 6) return 'Medium';
    return 'Hard';
  };

  const handleClick = () => {
    if (trend.article_url) {
      window.open(trend.article_url, '_blank', 'noopener,noreferrer');
    } else if (onClick) {
      onClick();
    }
  };

  const handleGenerateBusinessPlan = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (trend.article_url) {
      window.open(trend.article_url, '_blank', 'noopener,noreferrer');
    } else {
      // Navigate to Dream2Plan with pre-filled context from this trend
      navigate('/dream2plan', { 
        state: { 
          trendContext: {
            title: trend.title,
            category: trend.category,
            opportunity: trend.business_opportunity,
            keywords: trend.keywords
          }
        }
      });
    }
  };

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  const isArticle = Boolean(trend.article_url);
  const hasBusinessOpportunity = Boolean(trend.business_opportunity);

  return (
    <>
      <Card 
        className={cn(
          "hover:shadow-lg transition-all duration-300 cursor-pointer group border-0 bg-gradient-to-br from-background to-muted/20"
        )}
        onClick={handleClick}
      >
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-3">
            <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">
              {trend.title}
            </CardTitle>
            <div className="flex items-center gap-2 shrink-0">
              <BookmarkButton 
                postId={trend.id} 
                size="icon"
                className="h-8 w-8"
              />
              <div className="flex items-center gap-1 text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                <span className={getScoreColor(trend.opportunity_score)}>
                  {trend.opportunity_score.toFixed(0)}
                </span>
              </div>
            </div>
          </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="outline" className="text-xs font-medium">
            {trend.category.replace('-', ' ')}
          </Badge>
          <Badge className={`text-xs border ${getSentimentColor(trend.sentiment)}`}>
            {trend.sentiment}
          </Badge>
          {trend.entry_difficulty && (  
            <Badge className={`text-xs border ${getDifficultyColor(trend.entry_difficulty)}`}>
              {getDifficultyLabel(trend.entry_difficulty)}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Business Opportunity Section */}
        {hasBusinessOpportunity && trend.business_opportunity && (
          <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">Business Opportunity</span>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-muted-foreground mb-1">Market Gap:</p>
                <p className="text-foreground">{trend.business_opportunity.market_gap}</p>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-start gap-2">
                  <Users className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-muted-foreground">Target:</p>
                    <p className="text-foreground">{trend.business_opportunity.target_audience}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-muted-foreground">Revenue:</p>
                    <p className="text-foreground">{trend.business_opportunity.revenue_model}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Article Summary or Description */}
        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
          {trend.summary || trend.description}
        </p>
        
        <div className="space-y-3">
          {/* Action Steps */}
          {trend.action_steps && trend.action_steps.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Next Steps</span>
              </div>
              <div className="space-y-1">
                {trend.action_steps.slice(0, 2).map((step, index) => (
                  <div key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <span className="text-primary font-medium">{index + 1}.</span>
                    <span>{step}</span>
                  </div>
                ))}
                {trend.action_steps.length > 2 && (
                  <p className="text-xs text-muted-foreground ml-4">
                    +{trend.action_steps.length - 2} more steps
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Market Info */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Market Size</span>
            </div>
            <span className="font-medium">
              {trend.market_size_estimate || trend.market_size_indicator || 'Medium'}
            </span>
          </div>

          {/* Geographic Relevance */}
          {trend.geographic_relevance && trend.geographic_relevance.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {trend.geographic_relevance.join(', ')}
              </span>
            </div>
          )}

          {/* Keywords */}
          {trend.keywords && trend.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {trend.keywords.slice(0, 3).map((keyword, index) => (
                <Badge 
                  key={index}
                  variant="secondary" 
                  className="text-xs px-2 py-0.5"
                >
                  {keyword}
                </Badge>
              ))}
              {trend.keywords.length > 3 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  +{trend.keywords.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Article Source & Date */}
          {isArticle && (
            <div className="text-xs text-muted-foreground border-t pt-3">
              {trend.author && <span>By {trend.author} • </span>}
              {trend.article_source && <span>{trend.article_source}</span>}
              {trend.publication_date && (
                <span> • {new Date(trend.publication_date).toLocaleDateString()}</span>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            {hasBusinessOpportunity || isArticle ? (
              <Button 
                onClick={handleGenerateBusinessPlan}
                size="sm" 
                className="flex-1 text-xs h-8"
              >
                <Lightbulb className="h-3 w-3 mr-1" />
                {isArticle ? 'Read Full Article' : 'Create Business Plan'}
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            ) : (
              <Button 
                onClick={handleClick}
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs h-8"
              >
                Learn More
                <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Related Opportunities Section */}
    {showRelated && relatedOpportunities.length > 0 && (
      <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-muted">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Related Opportunities</span>
        </div>
        <div className="space-y-2">
          {relatedOpportunities.map((relatedTrend) => (
            <button
              key={relatedTrend.id}
              onClick={(e) => {
                e.stopPropagation();
                if (relatedTrend.article_url) {
                  window.open(relatedTrend.article_url, '_blank', 'noopener,noreferrer');
                }
              }}
              className="w-full text-left p-3 bg-background hover:bg-muted/50 rounded-md transition-colors group/related"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1 group-hover/related:text-primary transition-colors">
                    {relatedTrend.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {relatedTrend.category}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <TrendingUp className="w-3 h-3" />
                      <span>{relatedTrend.opportunity_score.toFixed(0)}</span>
                    </div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover/related:text-primary transition-all group-hover/related:translate-x-1 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      </div>
    )}
  </>
  );
};

export default TrendCard;