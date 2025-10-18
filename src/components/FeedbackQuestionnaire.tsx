import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Heart, Star, Coins, Sparkles } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FeedbackQuestionnaireProps {
  open: boolean;
  onClose: () => void;
  onComplete: (feedbackData: EnhancedFeedbackData) => void;
  sessionId?: string;
}

interface EnhancedFeedbackData {
  userRole: string;
  roleOther?: string;
  websiteUxRating: number;
  selectedFeatures: string[];
  featureOther?: string;
  pricingPerception: string;
  suggestedPrice?: number;
  suggestedCurrency?: string;
  improvementSuggestion?: string;
  email?: string;
  creditBonus?: number;
}

const FEATURE_OPTIONS = [
  { id: 'bizmap', label: '🗺️ BizMap (7-question business validation)', icon: '🗺️' },
  { id: 'insighta', label: '📊 Insighta (AI market research & competitor analysis)', icon: '📊' },
  { id: 'community', label: '👥 Community Hub (connect with entrepreneurs)', icon: '👥' },
  { id: 'sprint', label: '📈 Sprint Planner (task management & accountability)', icon: '📈' },
  { id: 'financial', label: '💰 Financial Projections & Valuation', icon: '💰' },
  { id: 'coaching', label: '🎯 Personalized AI Coaching', icon: '🎯' },
  { id: 'resources', label: '📚 Resources & Templates Library', icon: '📚' },
];

export const FeedbackQuestionnaire = ({ open, onClose, onComplete, sessionId }: FeedbackQuestionnaireProps) => {
  const [formData, setFormData] = useState<Partial<EnhancedFeedbackData>>({
    selectedFeatures: [],
    suggestedCurrency: 'USD'
  });
  const [showFeatureOther, setShowFeatureOther] = useState(false);
  const [showRoleOther, setShowRoleOther] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const totalSteps = 6;
  const { user } = useAuth();

  // Fixed credit bonus for survey completion
  const calculateCreditBonus = (): number => {
    return 5; // 5 free credits for completing the survey
  };

  const handleNext = () => {
    if (currentStep < totalSteps) {
      // Skip Q5 if pricing perception doesn't require it
      if (currentStep === 4 && !shouldShowQ5()) {
        setCurrentStep(6); // Jump to Q6
      } else {
        setCurrentStep(currentStep + 1);
      }
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
          user_id: user?.id || null,
          session_id: sessionId,
          user_role: formData.userRole,
          role_other: formData.roleOther,
          website_ux_rating: formData.websiteUxRating,
          selected_features: formData.selectedFeatures,
          feature_other: formData.featureOther,
          pricing_perception: formData.pricingPerception,
          suggested_price: formData.suggestedPrice,
          suggested_currency: formData.suggestedCurrency,
          improvement_suggestion: formData.improvementSuggestion,
          email: formData.email,
          credit_bonus_earned: creditBonus
        });

      if (error) throw error;

      // Store credit bonus in session for non-authenticated users
      sessionStorage.setItem('feedback-credit-bonus', creditBonus.toString());
      
      const feedbackData = { ...formData, creditBonus } as EnhancedFeedbackData;
      
      // Show success message with credit info
      toast.success(`Feedback submitted! You've earned ${creditBonus} free credits that will be added when you sign up!`, {
        duration: 5000
      });
      
      onComplete(feedbackData);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      toast.error('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = () => {
    return formData.userRole && 
           formData.websiteUxRating && 
           formData.selectedFeatures && 
           formData.selectedFeatures.length > 0 &&
           formData.pricingPerception;
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return !!formData.userRole;
      case 2:
        return !!formData.websiteUxRating;
      case 3:
        return formData.selectedFeatures && formData.selectedFeatures.length > 0;
      case 4:
        return !!formData.pricingPerception;
      case 5:
        // Q5 is conditional - if shown, price must be provided
        if (formData.pricingPerception === 'too_expensive' || formData.pricingPerception === 'great_value') {
          return formData.suggestedPrice && formData.suggestedPrice > 0;
        }
        return true; // Skip this step if not applicable
      case 6:
        return true; // Q6 is optional
      default:
        return false;
    }
  };

  const toggleFeature = (featureId: string) => {
    const current = formData.selectedFeatures || [];
    if (current.includes(featureId)) {
      setFormData({
        ...formData,
        selectedFeatures: current.filter(f => f !== featureId)
      });
    } else {
      if (current.length < 3) {
        setFormData({
          ...formData,
          selectedFeatures: [...current, featureId]
        });
      } else {
        toast.info('You can select up to 3 features');
      }
    }
  };

  const shouldShowQ5 = () => {
    return formData.pricingPerception === 'too_expensive' || formData.pricingPerception === 'great_value';
  };

  const renderStep = () => {
    switch (currentStep) {
      // Q1: Role & Experience Level
      case 1:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">What is your current role / experience level?</Label>
              <RadioGroup 
                value={formData.userRole} 
                onValueChange={(value) => {
                  setFormData({...formData, userRole: value});
                  setShowRoleOther(value === 'other');
                }}
                className="mt-3 space-y-2"
              >
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <RadioGroupItem value="entrepreneur" id="entrepreneur" />
                  <Label htmlFor="entrepreneur" className="cursor-pointer flex-1">🚀 Aspiring Entrepreneur / First-time Founder</Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <RadioGroupItem value="solopreneur" id="solopreneur" />
                  <Label htmlFor="solopreneur" className="cursor-pointer flex-1">💼 Solopreneur / Freelancer</Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <RadioGroupItem value="small_business" id="small_business" />
                  <Label htmlFor="small_business" className="cursor-pointer flex-1">🏢 Small Business Owner (2-10 employees)</Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <RadioGroupItem value="student" id="student" />
                  <Label htmlFor="student" className="cursor-pointer flex-1">🎓 Student / Exploring Ideas</Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <RadioGroupItem value="corporate" id="corporate" />
                  <Label htmlFor="corporate" className="cursor-pointer flex-1">🏭 Corporate / In-house Innovation</Label>
                </div>
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <RadioGroupItem value="other" id="role-other" />
                  <Label htmlFor="role-other" className="cursor-pointer flex-1">✨ Other</Label>
                </div>
              </RadioGroup>
              {showRoleOther && (
                <Input
                  placeholder="Please specify..."
                  value={formData.roleOther || ''}
                  onChange={(e) => setFormData({...formData, roleOther: e.target.value})}
                  className="mt-2"
                />
              )}
            </div>
          </div>
        );

      // Q2: Website UX Rating (5-star)
      case 2:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">How did you find our website usability / design / navigation?</Label>
              <div className="mt-4 flex flex-col items-center space-y-4">
                <div className="flex space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setFormData({...formData, websiteUxRating: rating})}
                      className="transition-all hover:scale-110"
                    >
                      <Star 
                        className={`w-10 h-10 ${
                          formData.websiteUxRating && rating <= formData.websiteUxRating 
                            ? 'fill-primary text-primary' 
                            : 'text-muted-foreground'
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <div className="flex justify-between w-full text-xs text-muted-foreground px-2">
                  <span>Very hard to use</span>
                  <span>Very easy to use</span>
                </div>
              </div>
            </div>
          </div>
        );

      // Q3: Feature Selection (multi-select)
      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Which features do you find most useful or important?</Label>
              <p className="text-sm text-muted-foreground mt-1">Select up to 3 features</p>
              <div className="mt-3 space-y-2">
                {FEATURE_OPTIONS.map((feature) => (
                  <div key={feature.id} className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                    <Checkbox
                      id={feature.id}
                      checked={formData.selectedFeatures?.includes(feature.id)}
                      onCheckedChange={() => toggleFeature(feature.id)}
                    />
                    <Label htmlFor={feature.id} className="cursor-pointer flex-1 font-normal">
                      {feature.label}
                    </Label>
                  </div>
                ))}
                <div className="flex items-center space-x-2 p-2 rounded hover:bg-accent">
                  <Checkbox
                    id="feature-other"
                    checked={showFeatureOther}
                    onCheckedChange={(checked) => {
                      setShowFeatureOther(!!checked);
                      if (!checked) {
                        setFormData({...formData, featureOther: undefined});
                      }
                    }}
                  />
                  <Label htmlFor="feature-other" className="cursor-pointer flex-1 font-normal">
                    🔄 Other
                  </Label>
                </div>
                {showFeatureOther && (
                  <Input
                    placeholder="Please specify..."
                    value={formData.featureOther || ''}
                    onChange={(e) => setFormData({...formData, featureOther: e.target.value})}
                    className="ml-8"
                  />
                )}
              </div>
              <Badge variant="secondary" className="mt-2">
                {formData.selectedFeatures?.length || 0} / 3 selected
              </Badge>
            </div>
          </div>
        );

      // Q4: Pricing Perception
      case 4:
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">What do you think of our pricing or what you might expect to pay for access?</Label>
              <RadioGroup 
                value={formData.pricingPerception} 
                onValueChange={(value) => setFormData({...formData, pricingPerception: value})}
                className="mt-3 space-y-2"
              >
                <div className="flex items-center space-x-3 p-3 rounded border hover:border-primary hover:bg-accent">
                  <RadioGroupItem value="too_expensive" id="too_expensive" />
                  <div className="flex-1">
                    <Label htmlFor="too_expensive" className="cursor-pointer font-semibold">💸 Too Expensive</Label>
                    <p className="text-xs text-muted-foreground">I'd need to see more value first</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded border hover:border-primary hover:bg-accent">
                  <RadioGroupItem value="fair" id="fair" />
                  <div className="flex-1">
                    <Label htmlFor="fair" className="cursor-pointer font-semibold">✅ Fair & Affordable</Label>
                    <p className="text-xs text-muted-foreground">This seems reasonable for what's offered</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded border hover:border-primary hover:bg-accent">
                  <RadioGroupItem value="great_value" id="great_value" />
                  <div className="flex-1">
                    <Label htmlFor="great_value" className="cursor-pointer font-semibold">🎁 Great Value</Label>
                    <p className="text-xs text-muted-foreground">This is cheaper than I expected</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded border hover:border-primary hover:bg-accent">
                  <RadioGroupItem value="need_more_info" id="need_more_info" />
                  <div className="flex-1">
                    <Label htmlFor="need_more_info" className="cursor-pointer font-semibold">🤔 Need More Info</Label>
                    <p className="text-xs text-muted-foreground">I want to try before deciding</p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          </div>
        );

      // Q5: Expected Fair Price (conditional)
      case 5:
        if (!shouldShowQ5()) {
          // Skip to Q6
          return renderStep6();
        }
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-base font-semibold">What would you consider a fair monthly price for premium access?</Label>
              <p className="text-sm text-muted-foreground mt-1">Most plans range from $9-$99/month</p>
              <div className="mt-3 flex space-x-2">
                <Select
                  value={formData.suggestedCurrency}
                  onValueChange={(value) => setFormData({...formData, suggestedCurrency: value})}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="AUD">AUD</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    min="1"
                    max="500"
                    placeholder="0"
                    value={formData.suggestedPrice || ''}
                    onChange={(e) => setFormData({...formData, suggestedPrice: parseFloat(e.target.value)})}
                    className="pl-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {formData.suggestedCurrency === 'EUR' ? '€' : 
                     formData.suggestedCurrency === 'GBP' ? '£' : 
                     formData.suggestedCurrency === 'CAD' ? 'C$' :
                     formData.suggestedCurrency === 'AUD' ? 'A$' : '$'}
                  </span>
                </div>
                <span className="flex items-center text-muted-foreground">/month</span>
              </div>
            </div>
          </div>
        );

      // Q6: Improvement Suggestion (optional)
      case 6:
        return renderStep6();

      default:
        return null;
    }
  };

  const renderStep6 = () => (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">If you could improve ONE thing about BizMap AI, what would it be?</Label>
        <Badge variant="outline" className="ml-2">Optional</Badge>
        <Textarea
          placeholder="e.g., More industry-specific templates, Video tutorials, Integration with tools, Mobile app..."
          value={formData.improvementSuggestion || ''}
          onChange={(e) => setFormData({...formData, improvementSuggestion: e.target.value})}
          className="mt-2"
          rows={3}
          maxLength={200}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {formData.improvementSuggestion?.length || 0} / 200 characters
        </p>
      </div>
      <div>
        <Label htmlFor="email" className="text-base">Email (optional - for personalized recommendations)</Label>
        <Input
          id="email"
          type="email"
          placeholder="your@email.com"
          value={formData.email || ''}
          onChange={(e) => setFormData({...formData, email: e.target.value})}
          className="mt-2"
        />
        {formData.email && (
          <p className="text-xs text-primary mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            +3 bonus credits for providing email
          </p>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-sm sm:max-w-md mx-auto">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center mb-2">
            <Heart className="w-6 h-6 text-white" />
          </div>
          <DialogTitle className="text-xl text-center">Help Us To Improve</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Complete this quick {totalSteps}-question survey and get 5 extra credits at no cost.
          </p>
          
          {/* Credit Bonus Display */}
          <div className="mt-3 p-3 bg-gradient-to-r from-primary/10 to-primary-glow/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-primary" />
              <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                Bonus: {calculateCreditBonus()} Free Credits
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground text-center">
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
          <div className="min-h-[150px] sm:min-h-[200px]">
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
                disabled={!isStepValid()}
                className="flex-1"
              >
                {currentStep === 4 && shouldShowQ5() ? 'Next' : currentStep === 4 ? 'Skip to Final' : 'Next'}
              </Button>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={!isFormValid() || isSubmitting}
                className="flex-1 bg-gradient-to-r from-primary to-primary-glow"
              >
                {isSubmitting ? (
                  <>
                    <Coins className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Heart className="w-4 h-4 mr-2" />
                    Get {calculateCreditBonus()} Credits
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