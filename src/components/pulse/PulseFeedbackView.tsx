import { useState } from 'react';
import { Bug, Lightbulb, Wrench, HelpCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFeedbackWidget, FeedbackType } from '@/hooks/useFeedbackWidget';
import { cn } from '@/lib/utils';

const feedbackTypes = [
  { type: 'bug' as FeedbackType, label: 'Bug Report', icon: Bug, color: 'text-red-500' },
  { type: 'feature' as FeedbackType, label: 'Feature', icon: Lightbulb, color: 'text-yellow-500' },
  { type: 'improvement' as FeedbackType, label: 'Improvement', icon: Wrench, color: 'text-blue-500' },
  { type: 'other' as FeedbackType, label: 'Other', icon: HelpCircle, color: 'text-gray-500' },
];

export const PulseFeedbackView = () => {
  const [selectedType, setSelectedType] = useState<FeedbackType>('bug');
  const [rating, setRating] = useState<number>(0);
  const [message, setMessage] = useState('');
  const { submitFeedback, isSubmitting } = useFeedbackWidget();

  const handleSubmit = async () => {
    if (!message.trim()) return;

    const success = await submitFeedback({
      feedbackType: selectedType,
      rating: rating > 0 ? rating : undefined,
      message: message.trim(),
    });

    if (success) {
      setMessage('');
      setRating(0);
      setSelectedType('bug');
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
      {/* Feedback Type Selection */}
      <div className="space-y-2">
        <Label className="text-xs">What type of feedback?</Label>
        <div className="grid grid-cols-2 gap-2">
          {feedbackTypes.map(({ type, label, icon: Icon, color }) => (
            <Button
              key={type}
              type="button"
              variant={selectedType === type ? 'default' : 'outline'}
              className={cn(
                'h-auto flex-col gap-1.5 py-2.5 text-xs',
                selectedType === type && 'ring-2 ring-primary'
              )}
              onClick={() => setSelectedType(type)}
            >
              <Icon className={cn('h-4 w-4', selectedType === type ? 'text-primary-foreground' : color)} />
              <span>{label}</span>
            </Button>
          ))}
        </div>
      </div>

      {/* Rating */}
      <div className="space-y-1.5">
        <Label className="text-xs">Rate your experience (optional)</Label>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <Button
              key={star}
              type="button"
              variant="ghost"
              size="sm"
              className="p-1 h-auto"
              onClick={() => setRating(star)}
            >
              <Star
                className={cn(
                  'h-5 w-5 transition-colors',
                  star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                )}
              />
            </Button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label htmlFor="pulse-feedback" className="text-xs">Your feedback *</Label>
        <Textarea
          id="pulse-feedback"
          placeholder="Tell us about your experience..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="resize-none text-sm"
        />
        <p className="text-xs text-muted-foreground">{message.length}/1000</p>
      </div>

      {/* Submit */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !message.trim()}
        className="w-full"
        size="sm"
      >
        {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
      </Button>
    </div>
  );
};
