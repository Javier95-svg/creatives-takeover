import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  targetAudience: string;
  solutionDifferentiator: string;
  founderEdge: string;
  nextGoals: string;
  mainCompetitors: string;
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

const QUESTIONS = [
  { number: '01', label: 'What specific problem are you solving?' },
  { number: '02', label: 'Who are you solving it for?' },
  { number: '03', label: 'What makes your solution different and more efficient?' },
  { number: '04', label: 'Why are you the right person to build this?' },
  { number: '05', label: 'What do you want to achieve next?' },
];

const ICPInputForm: React.FC<ICPInputFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<ICPInputFormData>({
    problemStatement: initialData?.problemStatement || '',
    targetAudience: initialData?.targetAudience || '',
    solutionDifferentiator: initialData?.solutionDifferentiator || '',
    founderEdge: initialData?.founderEdge || '',
    nextGoals: initialData?.nextGoals || '',
    mainCompetitors: initialData?.mainCompetitors || '',
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
    formData.targetAudience,
    formData.solutionDifferentiator,
    formData.founderEdge,
    formData.nextGoals,
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
              <span className="font-medium">Foundation Completion</span>
              <span className="text-muted-foreground">{Math.round(completionPercentage)}%</span>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {completedRequired} of {requiredFields.length} core questions answered
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Core Questions */}
      <div className="space-y-5">
        {/* Q1 */}
        <div className="space-y-2">
          <Label htmlFor="problemStatement" className="flex items-center gap-2">
            <span className="text-xs font-mono text-primary/60">{QUESTIONS[0].number}</span>
            {QUESTIONS[0].label} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="problemStatement"
            value={formData.problemStatement}
            onChange={(e) => setFormData(prev => ({ ...prev, problemStatement: e.target.value }))}
            placeholder="What painful gap or frustration does your startup address? Who experiences it, how often, and what does it cost them (time, money, stress)?"
            rows={4}
            className="resize-none"
            required
          />
        </div>

        {/* Q2 */}
        <div className="space-y-2">
          <Label htmlFor="targetAudience" className="flex items-center gap-2">
            <span className="text-xs font-mono text-primary/60">{QUESTIONS[1].number}</span>
            {QUESTIONS[1].label} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="targetAudience"
            value={formData.targetAudience}
            onChange={(e) => setFormData(prev => ({ ...prev, targetAudience: e.target.value }))}
            placeholder="Describe the specific person or group you're building for. Include their role, context, key traits, and why this problem matters most to them."
            rows={3}
            className="resize-none"
            required
          />
        </div>

        {/* Q3 */}
        <div className="space-y-2">
          <Label htmlFor="solutionDifferentiator" className="flex items-center gap-2">
            <span className="text-xs font-mono text-primary/60">{QUESTIONS[2].number}</span>
            {QUESTIONS[2].label} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="solutionDifferentiator"
            value={formData.solutionDifferentiator}
            onChange={(e) => setFormData(prev => ({ ...prev, solutionDifferentiator: e.target.value }))}
            placeholder="How does your solution work differently from what exists today? What makes it faster, cheaper, simpler, or more effective than the current alternatives?"
            rows={4}
            className="resize-none"
            required
          />
        </div>

        {/* Q4 */}
        <div className="space-y-2">
          <Label htmlFor="founderEdge" className="flex items-center gap-2">
            <span className="text-xs font-mono text-primary/60">{QUESTIONS[3].number}</span>
            {QUESTIONS[3].label} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="founderEdge"
            value={formData.founderEdge}
            onChange={(e) => setFormData(prev => ({ ...prev, founderEdge: e.target.value }))}
            placeholder="What gives you an edge here? Domain expertise, lived experience with this problem, a unique network, proprietary insight, or a background that others in this space don't have."
            rows={3}
            className="resize-none"
            required
          />
        </div>

        {/* Goals */}
        <div className="space-y-2">
          <Label htmlFor="nextGoals" className="flex items-center gap-2">
            <span className="text-xs font-mono text-primary/60">{QUESTIONS[4].number}</span>
            {QUESTIONS[4].label} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="nextGoals"
            value={formData.nextGoals}
            onChange={(e) => setFormData(prev => ({ ...prev, nextGoals: e.target.value }))}
            placeholder="e.g. Get my first 10 paying customers, validate PMF in 60 days, raise a pre-seed round, launch publicly on Product Hunt"
            rows={3}
            className="resize-none"
            required
          />
          <p className="text-xs text-muted-foreground">
            Be specific. These goals will shape the action plan in your analysis.
          </p>
        </div>
      </div>

      {/* Advanced Optional Fields */}
      <AdvancedFieldsSection
        defaultOpen={false}
        completedCount={[
          formData.mainCompetitors,
          formData.industry,
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
            <Label htmlFor="industry">Industry</Label>
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
                  Answer all 5 core questions
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  {completedRequired} of 5 answered. Complete all questions marked with * to generate your ICP analysis.
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
                  Foundation complete — ready for analysis
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  All 5 core questions answered. Click "Identify My ICP" to receive your niche market analysis.
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
        className={cn("w-full", !isFormValid && "opacity-50")}
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
