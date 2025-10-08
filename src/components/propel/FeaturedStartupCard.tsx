import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, Users, Star, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FeaturedStartupCardProps {
  post: {
    id: string;
    title: string;
    content: string;
    ai_summary?: string;
    user_id: string;
    tags?: string[];
    author_name?: string;
    author_avatar?: string;
  };
  successScore?: number;
  avgRating?: number;
}

const FeaturedStartupCard = ({ post, successScore, avgRating }: FeaturedStartupCardProps) => {
  const navigate = useNavigate();

  const handleViewPlan = () => {
    navigate('/community', { state: { scrollToPost: post.id } });
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all duration-300 border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="flex items-start justify-between mb-4">
        <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
          <Star className="w-3 h-3 mr-1" />
          Community Validated
        </Badge>
        {successScore && (
          <div className="flex items-center gap-1 text-sm font-semibold text-foreground">
            <TrendingUp className="w-4 h-4 text-green-500" />
            {successScore}% Success Score
          </div>
        )}
      </div>

      <h3 className="text-xl font-bold text-foreground mb-2 line-clamp-2">
        {post.title}
      </h3>

      <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
        {post.ai_summary || post.content.substring(0, 200)}
      </p>

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-4 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Avatar className="w-8 h-8">
            <AvatarImage src={post.author_avatar} />
            <AvatarFallback>
              <Users className="w-4 h-4" />
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-foreground">
              {post.author_name || 'Entrepreneur'}
            </p>
            {avgRating && (
              <p className="text-xs text-muted-foreground">
                {avgRating.toFixed(1)} avg rating
              </p>
            )}
          </div>
        </div>

        <Button onClick={handleViewPlan} variant="default" size="sm" className="gap-2">
          View Full Plan
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
};

export default FeaturedStartupCard;
