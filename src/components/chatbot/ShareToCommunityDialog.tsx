import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useShareToCommunity } from '@/hooks/useShareToCommunity';
import { Share2, CheckCircle2, Sparkles, Users } from 'lucide-react';

interface ShareToCommunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  reportType: 'conversation' | 'business_plan' | 'market_analysis' | 'financial_plan' | 'full_report';
  reportData: any;
  defaultTitle?: string;
  defaultContent?: string;
}

const FEEDBACK_CATEGORIES = [
  { id: 'market_validation', label: '🎯 Market Validation', description: 'Is this idea viable?' },
  { id: 'strategy', label: '🚀 Strategy Review', description: 'Review my approach' },
  { id: 'financial', label: '💰 Financial Feedback', description: 'Check my numbers' },
  { id: 'improvement', label: '💡 Improvements', description: 'How can I make this better?' },
  { id: 'partnerships', label: '🤝 Seeking Partners', description: 'Looking for collaborators' },
  { id: 'general', label: '💬 General Feedback', description: 'Any thoughts welcome' },
];

export const ShareToCommunityDialog = ({
  open,
  onOpenChange,
  conversationId,
  reportType,
  reportData,
  defaultTitle = '',
  defaultContent = '',
}: ShareToCommunityDialogProps) => {
  const [title, setTitle] = useState(defaultTitle);
  const [content, setContent] = useState(defaultContent);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['general']);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [tags, setTags] = useState('');
  const { shareToCommunity, isSharing } = useShareToCommunity();

  const handleShare = async () => {
    const result = await shareToCommunity({
      conversationId,
      reportType,
      reportData,
      title,
      content,
      feedbackCategories: selectedCategories,
      isAnonymous,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
    });

    if (result) {
      onOpenChange(false);
      // Reset form
      setTitle(defaultTitle);
      setContent(defaultContent);
      setSelectedCategories(['general']);
      setIsAnonymous(false);
      setTags('');
    }
  };

  const toggleCategory = (categoryId: string) => {
    setSelectedCategories(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share to Community for Feedback
          </DialogTitle>
          <DialogDescription>
            Share your business plan or insights with the community to get valuable feedback and suggestions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Report Type Badge */}
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <Badge variant="secondary" className="capitalize">
              {reportType.replace('_', ' ')}
            </Badge>
            <span className="text-sm text-muted-foreground">AI-Generated Report</span>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give your post a clear, engaging title"
              maxLength={200}
            />
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Description *</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => {
                const newValue = e.target.value;
                // Allow all characters including numbers, only limit by length
                if (newValue.length <= 5000) {
                  setContent(newValue);
                } else {
                  // If over limit, truncate to 5000 characters
                  setContent(newValue.slice(0, 5000));
                }
              }}
              placeholder="Add context about your business and what specific feedback you're looking for..."
              rows={6}
              maxLength={5000}
              inputMode="text"
            />
            <p className="text-xs text-muted-foreground text-right">
              <span className={content.length > 4500 ? 'text-destructive' : ''}>
                {content.length}/5000
              </span>
            </p>
          </div>

          {/* Feedback Categories */}
          <div className="space-y-3">
            <Label>What kind of feedback do you need? *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {FEEDBACK_CATEGORIES.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                    selectedCategories.includes(category.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => toggleCategory(category.id)}
                >
                  <Checkbox
                    checked={selectedCategories.includes(category.id)}
                    onCheckedChange={() => toggleCategory(category.id)}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{category.label}</div>
                    <div className="text-xs text-muted-foreground">{category.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., SaaS, FinTech, B2B, MVP"
            />
            <p className="text-xs text-muted-foreground">
              Add relevant tags to help community members find your post
            </p>
          </div>

          {/* Anonymous Option */}
          <div className="flex items-center space-x-3 p-3 rounded-lg border">
            <Checkbox
              id="anonymous"
              checked={isAnonymous}
              onCheckedChange={(checked) => setIsAnonymous(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="anonymous" className="cursor-pointer font-medium">
                Share anonymously
              </Label>
              <p className="text-xs text-muted-foreground">
                Your name won't be visible, but you'll still receive all feedback
              </p>
            </div>
          </div>

          {/* Preview Info */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              What happens next?
            </div>
            <ul className="text-sm text-muted-foreground space-y-1 ml-6">
              <li>✓ Your post will appear in the Community feed</li>
              <li>✓ Community members can comment and provide feedback</li>
              <li>✓ You'll receive notifications for all responses</li>
              <li>✓ AI will summarize feedback for you</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleShare} 
            disabled={!title.trim() || !content.trim() || selectedCategories.length === 0 || isSharing}
          >
            {isSharing ? (
              <>Sharing...</>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Share to Community
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
