import { useState } from 'react';
import { MessageSquare, X, Bug, Lightbulb, Wrench, HelpCircle, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { useFeedbackWidget, FeedbackType } from '@/hooks/useFeedbackWidget';
import { cn } from '@/lib/utils';

const feedbackTypes = [
  { type: 'bug' as FeedbackType, label: 'Bug Report', icon: Bug, color: 'text-red-500' },
  { type: 'feature' as FeedbackType, label: 'Feature Request', icon: Lightbulb, color: 'text-yellow-500' },
  { type: 'improvement' as FeedbackType, label: 'Improvement', icon: Wrench, color: 'text-blue-500' },
  { type: 'other' as FeedbackType, label: 'Other', icon: HelpCircle, color: 'text-gray-500' },
];

const FloatingFeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
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
      setIsOpen(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-50"
          size="icon"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Send Feedback</SheetTitle>
          <SheetDescription>
            Help us improve by sharing your thoughts, reporting bugs, or suggesting features.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Feedback Type Selection */}
          <div className="space-y-2">
            <Label>What type of feedback?</Label>
            <div className="grid grid-cols-2 gap-2">
              {feedbackTypes.map(({ type, label, icon: Icon, color }) => (
                <Button
                  key={type}
                  type="button"
                  variant={selectedType === type ? 'default' : 'outline'}
                  className={cn(
                    'h-auto flex-col gap-2 py-3',
                    selectedType === type && 'ring-2 ring-primary'
                  )}
                  onClick={() => setSelectedType(type)}
                >
                  <Icon className={cn('h-5 w-5', selectedType === type ? 'text-primary-foreground' : color)} />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Rating */}
          <div className="space-y-2">
            <Label>Rate your experience (optional)</Label>
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
                      'h-6 w-6 transition-colors',
                      star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                    )}
                  />
                </Button>
              ))}
            </div>
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Your feedback *</Label>
            <Textarea
              id="feedback-message"
              placeholder="Tell us more about your experience, issue, or suggestion..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              {message.length}/1000 characters
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !message.trim()}
              className="flex-1"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FloatingFeedbackWidget;
