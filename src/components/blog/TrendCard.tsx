import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, MapPin, Activity } from "lucide-react";

interface TrendCardProps {
  trend: {
    id: string;
    title: string;
    description: string;
    category: string;
    trend_score: number;
    opportunity_score: number;
    keywords: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
    market_size_indicator: string;
    geographic_relevance: string[];
    created_at: string;
  };
  onClick?: () => void;
}

const TrendCard = ({ trend, onClick }: TrendCardProps) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50';
      case 'negative': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600';
    if (score >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card 
      className="hover:shadow-md transition-all duration-200 cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors">
            {trend.title}
          </CardTitle>
          <div className="flex items-center gap-1 text-sm font-medium">
            <TrendingUp className="h-4 w-4" />
            <span className={getScoreColor(trend.trend_score)}>
              {trend.trend_score.toFixed(1)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {trend.category}
          </Badge>
          <Badge className={`text-xs ${getSentimentColor(trend.sentiment)}`}>
            {trend.sentiment}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
          {trend.description}
        </p>
        
        <div className="space-y-3">
          {/* Opportunity Score */}
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Opportunity</span>
            </div>
            <span className={`font-medium ${getScoreColor(trend.opportunity_score)}`}>
              {trend.opportunity_score.toFixed(1)}/10
            </span>
          </div>

          {/* Geographic Relevance */}
          {trend.geographic_relevance.length > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                {trend.geographic_relevance.join(', ')}
              </span>
            </div>
          )}

          {/* Keywords */}
          {trend.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {trend.keywords.slice(0, 4).map((keyword, index) => (
                <Badge 
                  key={index}
                  variant="secondary" 
                  className="text-xs px-2 py-0.5"
                >
                  {keyword}
                </Badge>
              ))}
              {trend.keywords.length > 4 && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5">
                  +{trend.keywords.length - 4}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendCard;