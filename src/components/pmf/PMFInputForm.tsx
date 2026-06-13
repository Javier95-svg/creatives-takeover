import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { X, Plus, AlertCircle, CheckCircle2, Loader2, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { DataSourceBadge } from './DataSourceBadge';
import { AdvancedFieldsSection } from './AdvancedFieldsSection';
import { mapWizardToPMF, hasWizardData, getMappingSummary, type WizardAnswers } from '@/services/wizardToPMFMapper';

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
  const { user } = useAuth();
  const { toast } = useToast();
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
  const [autoPopulatedFields, setAutoPopulatedFields] = useState<Set<string>>(new Set());
  const [dataSources, setDataSources] = useState<Record<string, string>>({});
  const [confidence, setConfidence] = useState<Record<string, number>>({});

  // Auto-populate from wizard data
  useEffect(() => {
    const loadWizardData = async () => {
      // Skip if we have initial data or business plan data already
      if (initialData || businessPlanData?.answers) return;

      // Convert businessPlanData to WizardAnswers format
      if (businessPlanData?.answers) {
        const wizardAnswers: WizardAnswers = {
          overview: businessPlanData.answers.problem,
          solution: businessPlanData.answers.solution,
          market: businessPlanData.answers.market,
          pricing: businessPlanData.answers.pricing,
        };

        if (hasWizardData(wizardAnswers)) {
          const mapping = mapWizardToPMF(wizardAnswers);

          // Update form data with mapped values
          setFormData(prev => ({ ...prev, ...mapping.data }));
          setAutoPopulatedFields(new Set(Object.keys(mapping.data)));
          setDataSources(mapping.mappings);
          setConfidence(mapping.confidence);

          // Show success toast
          toast({
            title: "Fields Auto-Filled",
            description: getMappingSummary(mapping),
          });
        }
      }
    };

    loadWizardData();
  }, [initialData, businessPlanData, toast]);

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
              <span className="font-medium">Problem Brief Completion</span>
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
            Core Problem <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="problemStatement"
            value={formData.problemStatement}
            onChange={(e) => setFormData(prev => ({ ...prev, problemStatement: e.target.value }))}
            placeholder="Describe the core problem and who feels it most."
            rows={4}
            className="resize-none"
            required
          />
          {autoPopulatedFields.has('problemStatement') && (
            <DataSourceBadge
              source={dataSources.problemStatement}
              confidence={confidence.problemStatement}
              compact
            />
          )}
          <p className="text-xs text-muted-foreground">
            Be precise about the pain and who experiences it.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="solutionDescription" className="flex items-center gap-2">
            Proposed Solution <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="solutionDescription"
            value={formData.solutionDescription}
            onChange={(e) => setFormData(prev => ({ ...prev, solutionDescription: e.target.value }))}
            placeholder="Describe your proposed solution and why it should relieve the pain."
            rows={4}
            className="resize-none"
            required
          />
          {autoPopulatedFields.has('solutionDescription') && (
            <DataSourceBadge
              source={dataSources.solutionDescription}
              confidence={confidence.solutionDescription}
              compact
            />
          )}
          <p className="text-xs text-muted-foreground">
            Explain why this solution should address the core problem.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="targetMarket" className="flex items-center gap-2">
              Primary Customer Segment <span className="text-destructive">*</span>
            </Label>
            <Input
              id="targetMarket"
              value={formData.targetMarket}
              onChange={(e) => setFormData(prev => ({ ...prev, targetMarket: e.target.value }))}
              placeholder="e.g., Boutique agencies, Solo consultants, Retail founders"
              required
            />
            {autoPopulatedFields.has('targetMarket') && (
              <DataSourceBadge
                source={dataSources.targetMarket}
                confidence={confidence.targetMarket}
                compact
              />
            )}
            <p className="text-xs text-muted-foreground">
              Who feels this pain most?
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industry">
              Industry Context
            </Label>
            <Select
              value={formData.industry}
              onValueChange={(value) => setFormData(prev => ({ ...prev, industry: value }))}
            >
              <SelectTrigger id="industry">
                <SelectValue placeholder="Select industry context" />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((industryOption) => (
                  <SelectItem key={industryOption} value={industryOption}>
                    {industryOption}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {autoPopulatedFields.has('industry') && (
              <DataSourceBadge
                source={dataSources.industry}
                confidence={confidence.industry}
                compact
              />
            )}
            <p className="text-xs text-muted-foreground">
              Helps provide Industry Context-specific insights
            </p>
          </div>
        </div>
      </div>

      {/* Advanced Optional Fields */}
      <AdvancedFieldsSection
        defaultOpen={false}
        completedCount={[
          formData.businessModel,
          formData.keyAssumptions.length > 0,
          formData.competitiveLandscape,
          formData.tractionValidation
        ].filter(Boolean).length}
        totalCount={4}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessModel">
              Revenue Model
            </Label>
            <Select
              value={formData.businessModel}
              onValueChange={(value) => setFormData(prev => ({ ...prev, businessModel: value }))}
            >
              <SelectTrigger id="businessModel">
                <SelectValue placeholder="Select Revenue Model" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_MODELS.map((model) => (
                  <SelectItem key={model} value={model}>
                    {model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {autoPopulatedFields.has('businessModel') && (
              <DataSourceBadge
                source={dataSources.businessModel}
                confidence={confidence.businessModel}
                compact
              />
            )}
            <p className="text-xs text-muted-foreground">
              How do you expect to capture value?
            </p>
          </div>

          {/* Problem Assumptions */}
          <div className="space-y-2">
            <Label>Problem Assumptions</Label>
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
              List Problem Assumptions you're making about the market, customers, or solution.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="competitiveLandscape">Current Alternatives</Label>
            <Textarea
              id="competitiveLandscape"
              value={formData.competitiveLandscape}
              onChange={(e) => setFormData(prev => ({ ...prev, competitiveLandscape: e.target.value }))}
              placeholder="What do customers use today? Who solves this now?"
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Helps identify current alternatives and gaps.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tractionValidation">Market Need Evidence</Label>
            <Textarea
              id="tractionValidation"
              value={formData.tractionValidation}
              onChange={(e) => setFormData(prev => ({ ...prev, tractionValidation: e.target.value }))}
              placeholder="Any early signals that demand exists? (e.g., interviews, waitlist, pre-orders)"
              rows={3}
              className="resize-none"
            />
            {autoPopulatedFields.has('tractionValidation') && (
              <DataSourceBadge
                source={dataSources.tractionValidation}
                confidence={confidence.tractionValidation}
                compact
              />
            )}
            <p className="text-xs text-muted-foreground">
              Share proof that the problem is real and urgent.
            </p>
          </div>
        </div>
      </AdvancedFieldsSection>

      {/* Validation Status */}
      {!isFormValid && (
        <Card className="border-warning/30 bg-warning-subtle">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-warning">
                  Complete Required Fields
                </p>
                <p className="text-xs text-warning/90 mt-1">
                  Please fill in all required fields (marked with *) to proceed with analysis.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isFormValid && (
        <Card className="border-success/30 bg-success-subtle">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-success mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-success">
                  Ready to Analyze Market Need
                </p>
                <p className="text-xs text-success/90 mt-1">
                  All required fields are complete. Click "Analyze Market Need" to proceed.
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
            Analyzing Market Need...
          </>
        ) : (
          <>
            <Target className="w-4 h-4 mr-2" />
            Analyze Market Need
          </>
        )}
      </Button>
    </form>
  );
};

export default PMFInputForm;



