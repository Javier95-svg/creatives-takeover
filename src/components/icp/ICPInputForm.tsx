import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, CheckCircle2, Loader2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdvancedFieldsSection } from '@/components/pmf/AdvancedFieldsSection';

export interface ICPInputFormData {
  problemStatement: string;
  productDescription: string;
  targetAudience: string;
  mainCompetitors: string;
  unfairAdvantage: string;
  industry: string;
  revenueModel: string;
  currentTraction: string;
}

interface ICPInputFormProps {
  initialData?: Partial<ICPInputFormData>;
  onSubmit: (data: ICPInputFormData) => void;
  isSubmitting?: boolean;
}

const INDUSTRIES = [
  'Technology/SaaS',
  'E-commerce/Retail',
  'Healthcare',
  'Education',
  'Finance/Fintech',
  'Real Estate',
  'Food & Beverage',
  'Fitness/Wellness',
  'Entertainment/Media',
  'Professional Services',
  'Marketing/Advertising',
  'Manufacturing',
  'Travel/Hospitality',
  'Non-Profit',
  'Other'
];

const REVENUE_MODELS = [
  'SaaS (Subscription)',
  'Marketplace',
  'E-commerce',
  'Freemium',
  'One-time Purchase',
  'Commission/Transaction Fee',
  'Advertising',
  'Licensing',
  'Agency/Service',
  'Consulting',
  'Other'
];

const ICPInputForm: React.FC<ICPInputFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<ICPInputFormData>({
    problemStatement: initialData?.problemStatement || '',
    productDescription: initialData?.productDescription || '',
    targetAudience: initialData?.targetAudience || '',
    mainCompetitors: initialData?.mainCompetitors || '',
    unfairAdvantage: initialData?.unfairAdvantage || '',
    industry: initialData?.industry || '',
    revenueModel: initialData?.revenueModel || '',
    currentTraction: initialData?.currentTraction || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const requiredFields = [
    formData.problemStatement,
    formData.productDescription,
    formData.targetAudience,
  ];
  const completedRequired = requiredFields.filter(f => f.trim()).length;
  const completionPercentage = (completedRequired / requiredFields.length) * 100;
  const isFormValid = completedRequired === requiredFields.length;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Progress Indicator */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Product Brief Completion</span>
              <span className="text-muted-foreground">{Math.round(completionPercentage)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completedRequired} of {requiredFields.length} required fields completed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Required Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="problemStatement" className="flex items-center gap-2">
            Problem You're Solving <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="problemStatement"
            value={formData.problemStatement}
            onChange={(e) => setFormData(prev => ({ ...prev, problemStatement: e.target.value }))}
            placeholder="What specific problem does your product/service solve? Who experiences this problem and how painful is it for them?"
            rows={4}
            className="resize-none"
            required
          />
          <p className="text-xs text-muted-foreground">
            Be specific about the pain point and who feels it most intensely.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="productDescription" className="flex items-center gap-2">
            Product / Service Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="productDescription"
            value={formData.productDescription}
            onChange={(e) => setFormData(prev => ({ ...prev, productDescription: e.target.value }))}
            placeholder="Describe your product or service. What does it do? How does it solve the problem? What makes it unique?"
            rows={4}
            className="resize-none"
            required
          />
          <p className="text-xs text-muted-foreground">
            Include key features, how it works, and what makes it different from alternatives.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="targetAudience" className="flex items-center gap-2">
              Current / Intended Target Audience <span className="text-destructive">*</span>
            </Label>
            <Input
              id="targetAudience"
              value={formData.targetAudience}
              onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
              placeholder="e.g., Solo founders, D2C brand owners, Freelance designers"
              required
            />
            <p className="text-xs text-muted-foreground">
              Who do you think your ideal customer is right now?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">
              Industry
            </Label>
            <Select
              value={formData.industry}
              onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
            >
              <SelectTrigger id="industry">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((ind) => (
                  <SelectItem key={ind} value={ind}>
                    {ind}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Helps provide industry-specific niche insights.
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Optional Fields */}
      <AdvancedFieldsSection
        defaultOpen={false}
        completedCount={[
          formData.mainCompetitors,
          formData.unfairAdvantage,
          formData.revenueModel,
          formData.currentTraction
        ].filter(Boolean).length}
        totalCount={4}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mainCompetitors">Main Competitors</Label>
            <Textarea
              id="mainCompetitors"
              value={formData.mainCompetitors}
              onChange={(e) => setFormData(prev => ({ ...prev, mainCompetitors: e.target.value }))}
              placeholder="List your main competitors and what they offer. What do customers use today to solve this problem?"
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Include direct and indirect competitors. What are their strengths and weaknesses?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="unfairAdvantage">Your Unfair Advantage</Label>
            <Textarea
              id="unfairAdvantage"
              value={formData.unfairAdvantage}
              onChange={(e) => setFormData(prev => ({ ...prev, unfairAdvantage: e.target.value }))}
              placeholder="What gives you an edge? (e.g., domain expertise, proprietary tech, unique access, network, speed)"
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              What makes you uniquely positioned to win in this market?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="revenueModel">Revenue Model</Label>
            <Select
              value={formData.revenueModel}
              onValueChange={(value) => setFormData(prev => ({ ...prev, revenueModel: value }))}
            >
              <SelectTrigger id="revenueModel">
                <SelectValue placeholder="Select revenue model" />
              </SelectTrigger>
              <SelectContent>
                {REVENUE_MODELS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              How do you plan to make money?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="currentTraction">Current Traction / Validation</Label>
            <Textarea
              id="currentTraction"
              value={formData.currentTraction}
              onChange={(e) => setFormData(prev => ({ ...prev, currentTraction: e.target.value }))}
              placeholder="Any early signals? (e.g., waitlist sign-ups, customer interviews, pilot users, pre-orders, social proof)"
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Share any proof that demand exists for your product.
            </p>
          </div>
        </div>
      </AdvancedFieldsSection>

      {/* Validation Status */}
      {!isFormValid && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Complete Required Fields
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  Please fill in all required fields (marked with *) to generate your ICP analysis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isFormValid && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-200">
                  Ready to Identify Your ICP
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  All required fields are complete. Click "Identify My ICP" to receive your niche market analysis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit Button */}
      <Button
        type="submit"
        disabled={!isFormValid || isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyzing Your Niche Market...
          </>
        ) : (
          <>
            <Target className="w-4 h-4 mr-2" />
            Identify My ICP
          </>
        )}
      </Button>
    </form>
  );
};

export default ICPInputForm;
