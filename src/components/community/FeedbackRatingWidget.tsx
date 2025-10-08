import { useState } from 'react';
import { Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useFeedbackRatings } from '@/hooks/useFeedbackRatings';

interface FeedbackRatingWidgetProps {
  postId: string;
  showRatingForm?: boolean;
}

const FeedbackRatingWidget = ({ postId, showRatingForm = false }: FeedbackRatingWidgetProps) => {
  const { averages, userRating, submitRating, isLoading } = useFeedbackRatings(postId);
  const [clarity, setClarity] = useState(userRating?.clarity_score || 0);
  const [marketFit, setMarketFit] = useState(userRating?.market_fit_score || 0);
  const [innovation, setInnovation] = useState(userRating?.innovation_score || 0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (clarity === 0 || marketFit === 0 || innovation === 0) return;
    
    setIsSubmitting(true);
    await submitRating(clarity, marketFit, innovation);
    setIsSubmitting(false);
  };

  const RatingStars = ({ 
    value, 
    onChange, 
    readonly = false 
  }: { 
    value: number; 
    onChange?: (val: number) => void;
    readonly?: boolean;
  }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => !readonly && onChange?.(star)}
          className="focus:outline-none disabled:cursor-default"
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              star <= value
                ? 'fill-amber-400 text-amber-400'
                : 'text-muted-foreground/30'
            } ${!readonly && 'hover:text-amber-300'}`}
          />
        </button>
      ))}
    </div>
  );

  if (!showRatingForm && averages) {
    return (
      <Card className="p-4 bg-card/50 border-border/50">
        <h4 className="text-sm font-semibold mb-3 text-foreground">Community Feedback</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Clarity</span>
            <div className="flex items-center gap-2">
              <RatingStars value={Math.round(averages.clarity)} readonly />
              <span className="text-sm font-medium text-foreground">{averages.clarity}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Market Fit</span>
            <div className="flex items-center gap-2">
              <RatingStars value={Math.round(averages.market_fit)} readonly />
              <span className="text-sm font-medium text-foreground">{averages.market_fit}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Innovation</span>
            <div className="flex items-center gap-2">
              <RatingStars value={Math.round(averages.innovation)} readonly />
              <span className="text-sm font-medium text-foreground">{averages.innovation}</span>
            </div>
          </div>
          <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
            Based on {averages.total_ratings} {averages.total_ratings === 1 ? 'rating' : 'ratings'}
          </div>
        </div>
      </Card>
    );
  }

  if (showRatingForm && !userRating) {
    return (
      <Card className="p-4 bg-card/50 border-border/50">
        <h4 className="text-sm font-semibold mb-3 text-foreground">Rate This Plan</h4>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Clarity</label>
            <RatingStars value={clarity} onChange={setClarity} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Market Fit</label>
            <RatingStars value={marketFit} onChange={setMarketFit} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Innovation</label>
            <RatingStars value={innovation} onChange={setInnovation} />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || clarity === 0 || marketFit === 0 || innovation === 0}
            className="w-full"
            size="sm"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Rating'}
          </Button>
        </div>
      </Card>
    );
  }

  return null;
};

export default FeedbackRatingWidget;
