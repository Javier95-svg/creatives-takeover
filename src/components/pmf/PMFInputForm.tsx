import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Plus, AlertCircle, CheckCircle2, Loader2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PMFInputFormData {
  problemStatement: string;
  solutionDescription: string;
  targetMarket: string;
  businessModel: string;
  industry: string;
  keyAssumptions: string[];
  competitiveLandscape: string;
  tractionValidation: string;
}

interface PMFInputFormProps {
  initialData?: Partial<PMFInputFormData>;
  businessPlanData?: {
    answers?: {
      problem?: string;
      solution?: string;
      market?: string;
      pricing?: string;
    };
  };
  onSubmit: (data: PMFInputFormData) => void;
  isSubmitting?: boolean;
}

const BUSINESS_MODELS = [
  'SaaS (Subscription)',
  'Marketplace',
  'E-commerce',
  'Freemium',
  'One-time Purchase',
  'Commission/Transaction Fee',
  'Advertising',
  'Licensing',
  'Other'
];

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
  'Manufacturing',
  'Other'
];

const PMFInputForm: React.FC<PMFInputFormProps> = ({
  initialData,
  businessPlanData,
  onSubmit,
  isSubmitting = false
}) => {
  const [formData, setFormData] = useState<PMFInputFormData>({
    problemStatement: initialData?.problemStatement || businessPlanData?.answers?.problem || '',
    solutionDescription: initialData?.solutionDescription || businessPlanData?.answers?.solution || '',
    targetMarket: initialData?.targetMarket || businessPlanData?.answers?.market || '',
    businessModel: initialData?.businessModel || '',
    industry: initialData?.industry || '',
    keyAssumptions: initialData?.keyAssumptions || [],
    competitiveLandscape: initialData?.competitiveLandscape || '',
    tractionValidation: initialData?.tractionValidation || '',
  });

  const [newAssumption, setNewAssumption] = useState('');

  const addAssumption = () => {
    if (newAssumption.trim()) {
      setFormData(prev => ({
        ...prev,
        keyAssumptions: [...prev.keyAssumptions, newAssumption.trim()]
      }));
      setNewAssumption('');
    }
  };

  const removeAssumption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      keyAssumptions: prev.keyAssumptions.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Calculate completion percentage
  const requiredFields = [
    formData.problemStatement,
    formData.solutionDescription,
    formData.targetMarket,
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
              <span className="font-medium">Form Completion</span>
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
            Problem Statement <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="problemStatement"
            value={formData.problemStatement}
            onChange={(e) => setFormData(prev => ({ ...prev, problemStatement: e.target.value }))}
            placeholder="Describe the problem you're solving. What pain point does your target market experience?"
            rows={4}
            className="resize-none"
            required
          />
          <p className="text-xs text-muted-foreground">
            Be specific about the problem and who experiences it.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="solutionDescription" className="flex items-center gap-2">
            Solution Description <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="solutionDescription"
            value={formData.solutionDescription}
            onChange={(e) => setFormData(prev => ({ ...prev, solutionDescription: e.target.value }))}
            placeholder="Describe your solution. How does your product/service solve the problem?"
            rows={4}
            className="resize-none"
            required
          />
          <p className="text-xs text-muted-foreground">
            Explain how your solution addresses the problem you identified.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="targetMarket" className="flex items-center gap-2">
              Target Market <span className="text-destructive">*</span>
            </Label>
            <Input
              id="targetMarket"
              value={formData.targetMarket}
              onChange={(e) => setFormData(prev => ({ ...prev, targetMarket: e.target.value }))}
              placeholder="e.g., Small business owners, Students, etc."
              required
            />
            <p className="text-xs text-muted-foreground">
              Who is your primary customer?
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
                <SelectValue placeholder="Select industry" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Helps provide industry-specific insights
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="businessModel">
            Business Model
          </Label>
          <Select
            value={formData.businessModel}
            onValueChange={(value) => setFormData(prev => ({ ...prev, businessModel: value }))}
          >
            <SelectTrigger id="businessModel">
              <SelectValue placeholder="Select business model" />
            </SelectTrigger>
            <SelectContent>
              {BUSINESS_MODELS.map((model) => (
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
      </div>

      {/* Key Assumptions */}
      <div className="space-y-2">
        <Label>Key Assumptions</Label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              value={newAssumption}
              onChange={(e) => setNewAssumption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAssumption();
                }
              }}
              placeholder="Enter an assumption and press Enter"
            />
            <Button
              type="button"
              onClick={addAssumption}
              variant="outline"
              size="icon"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {formData.keyAssumptions.length > 0 && (
            <div className="space-y-1">
              {formData.keyAssumptions.map((assumption, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm"
                >
                  <span className="flex-1">{assumption}</span>
                  <Button
                    type="button"
                    onClick={() => removeAssumption(index)}
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          List key assumptions you're making about the market, customers, or solution.
        </p>
      </div>

      {/* Optional Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="competitiveLandscape">Competitive Landscape (Optional)</Label>
          <Textarea
            id="competitiveLandscape"
            value={formData.competitiveLandscape}
            onChange={(e) => setFormData(prev => ({ ...prev, competitiveLandscape: e.target.value }))}
            placeholder="Who are your main competitors? What are their strengths and weaknesses?"
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Help us understand the competitive environment.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tractionValidation">Traction/Validation (Optional)</Label>
          <Textarea
            id="tractionValidation"
            value={formData.tractionValidation}
            onChange={(e) => setFormData(prev => ({ ...prev, tractionValidation: e.target.value }))}
            placeholder="Any early traction, validation, or customer feedback? (e.g., beta users, pre-orders, pilot programs)"
            rows={3}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Share any validation signals you've already received.
          </p>
        </div>
      </div>

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
                  Please fill in all required fields (marked with *) to proceed with analysis.
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
                  Ready to Analyze
                </p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                  All required fields are complete. Click "Analyze Product-Market Fit" to proceed.
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
            Analyzing PMF...
          </>
        ) : (
          <>
            <Target className="w-4 h-4 mr-2" />
            Analyze Product-Market Fit
          </>
        )}
      </Button>
    </form>
  );
};

export default PMFInputForm;

