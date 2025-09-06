import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Gift, Star, MessageCircle, Coins } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCredits } from '@/hooks/useCredits';
import { toast } from 'sonner';

interface FeedbackQuestionnaireProps {
  open: boolean;
  onClose: () => void;
  onComplete: (feedbackData: FeedbackData) => void;
  sessionId?: string;
}

interface FeedbackData {
  email?: string;
  acquisitionSource: string;
  uxRating: number;
  featureRequest: string;
  npsScore: number;
  businessChallenge: string;
  additionalComments?: string;
  creditBonus?: number;
}

export const FeedbackQuestionnaire = ({ open, onClose, onComplete, sessionId }: FeedbackQuestionnaireProps) => {
  const [formData, setFormData] = useState<Partial<FeedbackData>>({});
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 5;
  const { addCredits } = useCredits();

  // Calculate credit bonus based on responses
  const calculateCreditBonus = (): number => {
    let bonus = 2; // Base bonus for completion
    
    // Email bonus
    if (formData.email && formData.email.trim() !== '') {
      bonus += 3;
    }
    
    // High NPS bonus
    if (formData.npsScore && formData.npsScore >= 9) {
      bonus += 1;
    }
    
    // Detailed feature request bonus
    if (formData.featureRequest && formData.featureRequest.length > 20) {
      bonus += 1;
    }
    
    // Referral source bonus
    if (formData.acquisitionSource === 'referral') {
      bonus += 2;
    }
    
    return bonus;
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setIsSubmitting(true);
    try {
      const creditBonus = calculateCreditBonus();
      
      // Save feedback to Supabase
      const { error } = await supabase
        .from('user_feedback')
        .insert({
          session_id: sessionId,
          email: formData.email,
          acquisition_source: formData.acquisitionSource,
          ux_rating: formData.uxRating,
          feature_request: formData.featureRequest,
          nps_score: formData.npsScore,
          business_challenge: formData.businessChallenge,
          additional_comments: formData.additionalComments
        });

      if (error) throw error;

      // Store credit bonus in session for non-authenticated users
      sessionStorage.setItem('feedback-credit-bonus', creditBonus.toString());
      
      const feedbackData = { ...formData, creditBonus } as FeedbackData;
      
      // Show success message with credit info
      toast.success(`Feedback submitted! You've earned ${creditBonus} free credits that will be added when you sign up!`);
      
      onComplete(feedbackData);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return formData.acquisitionSource && 
           formData.uxRating && 
           formData.featureRequest && 
           formData.npsScore !== undefined && 
           formData.businessChallenge;
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="acquisition">What brought you to BizMap AI today?</Label>
              <RadioGroup 
                value={formData.acquisitionSource} 
                onValueChange={(value) => setFormData({...formData, acquisitionSource: value})}
                className="mt-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="google" id="google" />
                  <Label htmlFor="google">Google Search</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="social" id="social" />
                  <Label htmlFor="social">Social Media</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="referral" id="referral" />
                  <Label htmlFor="referral">Friend Referral</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="content" id="content" />
                  <Label htmlFor="content">Blog/Content</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other">Other</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="ux-rating">How clear and easy were our 7 questions?</Label>
              <RadioGroup 
                value={formData.uxRating?.toString()} 
                onValueChange={(value) => setFormData({...formData, uxRating: parseInt(value)})}
                className="mt-2 flex space-x-4"
              >
                {[1, 2, 3, 4, 5].map((rating) => (
                  <div key={rating} className="flex flex-col items-center space-y-1">
                    <RadioGroupItem value={rating.toString()} id={`rating-${rating}`} />
                    <Label htmlFor={`rating-${rating}`} className="text-xs">
                      {rating === 1 ? 'Confusing' : rating === 5 ? 'Very Clear' : rating}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="feature">What feature would make BizMap AI more valuable to you?</Label>
              <Textarea
                id="feature"
                placeholder="e.g., Financial projections, Market analysis, Competitor research..."
                value={formData.featureRequest || ''}
                onChange={(e) => setFormData({...formData, featureRequest: e.target.value})}
                className="mt-2"
                rows={3}
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="nps">How likely are you to recommend BizMap AI? (0-10)</Label>
              <RadioGroup 
                value={formData.npsScore?.toString()} 
                onValueChange={(value) => setFormData({...formData, npsScore: parseInt(value)})}
                className="mt-2 grid grid-cols-6 gap-2"
              >
                {Array.from({length: 11}, (_, i) => (
                  <div key={i} className="flex flex-col items-center space-y-1">
                    <RadioGroupItem value={i.toString()} id={`nps-${i}`} />
                    <Label htmlFor={`nps-${i}`} className="text-xs">{i}</Label>
                  </div>
                ))}
              </RadioGroup>
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="challenge">What's your biggest business challenge right now?</Label>
              <Textarea
                id="challenge"
                placeholder="e.g., Finding customers, Raising funds, Building a team, Validating my idea..."
                value={formData.businessChallenge || ''}
                onChange={(e) => setFormData({...formData, businessChallenge: e.target.value})}
                className="mt-2"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="email">Email (optional - for follow-up resources)</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email || ''}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="comments">Any additional thoughts?</Label>
              <Textarea
                id="comments"
                placeholder="Optional feedback..."
                value={formData.additionalComments || ''}
                onChange={(e) => setFormData({...formData, additionalComments: e.target.value})}
                className="mt-2"
                rows={2}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center mb-2">
            <Gift className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-xl">Get Your FREE Business Report!</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Complete this quick {totalSteps}-question survey and receive your comprehensive business report at no cost.
          </p>
          
          {/* Credit Bonus Display */}
          <div className="mt-3 p-3 bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-primary" />
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                Bonus: {calculateCreditBonus()} Free Credits
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Credits will be added to your account when you sign up!
            </p>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Question {currentStep} of {totalSteps}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}%</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary to-primary-glow h-2 rounded-full transition-all duration-300" 
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Question content */}
          <div className="min-h-[200px]">
            {renderStep()}
          </div>

          {/* Navigation buttons */}
          <div className="flex justify-between space-x-2">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              disabled={currentStep === 1}
              className="flex-1"
            >
              Back
            </Button>
            
            {currentStep < totalSteps ? (
              <Button 
                onClick={handleNext} 
                disabled={!formData[Object.keys(formData)[currentStep - 1] as keyof FeedbackData]}
                className="flex-1"
              >
                Next
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={!isFormValid() || isSubmitting}
                className="flex-1 bg-gradient-to-r from-primary to-primary-glow"
              >
                {isSubmitting ? (
                  <>
                    <MessageCircle className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Star className="w-4 h-4 mr-2" />
                    Get FREE Report
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};