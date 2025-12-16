import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Target, Users, CheckCircle2, FileText, FlaskConical, TrendingUp, ArrowRight, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/hooks/useCredits';
import { CreditGate } from '@/components/CreditGate';
import { CREDIT_COSTS } from '@/config/constants';
import { supabase } from '@/integrations/supabase/client';
import PMFScore from './PMFScore';
import PMFAnalysisResults from './PMFAnalysisResults';
import CustomerSegments from './CustomerSegments';
import ProblemSolutionFit from './ProblemSolutionFit';
import ValidationExperiments from './ValidationExperiments';
import PMFInputForm from './PMFInputForm';

interface ProductMarketFitLabProps {
  businessPlanData?: {
    answers?: {
      overview?: string;
      market?: string;
      problem?: string;
      solution?: string;
      channels?: string;
      pricing?: string;
      goals?: string;
    };
    launchReport?: string;
    successScore?: any;
  };
  onDataExport?: (data: {
    selectedSegment?: string;
    refinedProblem?: string;
    pmfScore?: number;
    experiments?: any[];
  }) => void;
}

interface PMFAnalysis {
  pmfScore: {
    overall: number;
    verdict: 'Strong Fit' | 'Moderate Fit' | 'Weak Fit';
    subScores: {
      demand: number;
      differentiation: number;
      timing: number;
      executionRisk: number;
    };
    reasoning: string;
  };
  marketAnalysis: {
    demand: {
      assessment: string;
      marketSize: string;
      growthProjection: string;
      trends: string[];
    };
    competitiveLandscape: {
      directCompetitors: Array<{
        name: string;
        strengths: string[];
        weaknesses: string[];
      }>;
      indirectCompetitors: string[];
      marketPositioning: string;
      competitiveIntensity: 'High' | 'Medium' | 'Low';
    };
    differentiation: {
      uniqueValue: string;
      competitiveAdvantages: string[];
      moats: string[];
      differentiationGaps: string[];
    };
    scalability: {
      expansionPotential: string;
      unitEconomics: string;
      growthConstraints: string[];
      scalabilityScore: string;
    };
    risks: {
      marketRisks: Array<{
        risk: string;
        severity: 'High' | 'Medium' | 'Low';
        mitigation: string;
      }>;
      executionRisks: Array<{
        risk: string;
        severity: 'High' | 'Medium' | 'Low';
        mitigation: string;
      }>;
      timingRisks: Array<{
        risk: string;
        severity: 'High' | 'Medium' | 'Low';
        mitigation: string;
      }>;
    };
  };
  nextSteps: Array<{
    priority: 'High' | 'Medium' | 'Low';
    action: string;
    description: string;
    estimatedTime?: string;
  }>;
  customerSegments?: Array<{
    name: string;
    demographics: string;
    psychographics: string;
    painPoints: string[];
    marketSize: string;
    accessibilityScore: number;
  }>;
  validationExperiments?: Array<{
    name: string;
    type: string;
    hypothesis: string;
    successMetrics: string[];
    estimatedTime: string;
    estimatedCost: string;
    priority: 'High' | 'Medium' | 'Low';
  }>;
  problemSolutionFit?: {
    alignmentScore: number;
    reasoning: string;
    gaps: string[];
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  surveys?: {
    primarySegment: string;
    questions: string[];
  };
  interviewScripts?: {
    opening: string[];
    problemExploration: string[];
    solutionValidation: string[];
    pricingSensitivity: string[];
    closing: string[];
  };
}

const ProductMarketFitLab: React.FC<ProductMarketFitLabProps> = ({ 
  businessPlanData,
  onDataExport 
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { hasCredits } = useCredits();
  const [creditGateOpen, setCreditGateOpen] = useState(false);
  
  const [structuredFormData, setStructuredFormData] = useState<any>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PMFAnalysis | null>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('input');
  const [selectedSegment, setSelectedSegment] = useState<string | undefined>();

  const handleExportSurvey = () => {
    console.log('Exporting survey:', analysis?.surveys);
    toast({
      title: "Survey Exported",
      description: "Survey has been prepared for download.",
    });
  };

  const handleExportInterviewScript = () => {
    console.log('Exporting interview script:', analysis?.interviewScripts);
    toast({
      title: "Interview Script Exported",
      description: "Interview script has been prepared for download.",
    });
  };

  const handleStructuredFormSubmit = async (formData: any) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to use PMF Analysis",
        variant: "destructive",
      });
      return;
    }

    if (!hasCredits(CREDIT_COSTS.PMF_ANALYSIS)) {
      setCreditGateOpen(true);
      return;
    }

    setStructuredFormData(formData);

    try {
      setIsAnalyzing(true);
      
      // Build comprehensive business description from structured form
      const businessDescriptionParts = [];
      businessDescriptionParts.push(`Problem: ${formData.problemStatement}`);
      businessDescriptionParts.push(`Solution: ${formData.solutionDescription}`);
      if (formData.targetMarket) {
        businessDescriptionParts.push(`Target Market: ${formData.targetMarket}`);
      }
      if (formData.industry) {
        businessDescriptionParts.push(`Industry: ${formData.industry}`);
      }
      if (formData.businessModel) {
        businessDescriptionParts.push(`Business Model: ${formData.businessModel}`);
      }
      if (formData.keyAssumptions.length > 0) {
        businessDescriptionParts.push(`Key Assumptions:\n${formData.keyAssumptions.map((a: string, i: number) => `${i + 1}. ${a}`).join('\n')}`);
      }
      if (formData.competitiveLandscape) {
        businessDescriptionParts.push(`Competitive Landscape: ${formData.competitiveLandscape}`);
      }
      if (formData.tractionValidation) {
        businessDescriptionParts.push(`Traction/Validation: ${formData.tractionValidation}`);
      }

      const businessDescription = businessDescriptionParts.join('\n\n');
      
      const { data, error } = await supabase.functions.invoke('pmf-analyzer', {
        body: {
          businessDescription: businessDescription,
          targetMarket: formData.targetMarket || undefined,
          industry: formData.industry || undefined,
          businessPlanData: businessPlanData ? {
            answers: businessPlanData.answers,
            launchReport: businessPlanData.launchReport
          } : undefined,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.creditError) {
        setCreditGateOpen(true);
        return;
      }

      if (data?.success && data?.analysis) {
        setAnalysis(data.analysis);
        setAnalysisId(data.analysisId || null);
        
        // Export data back to business planner
        if (onDataExport && data.analysis) {
          onDataExport({
            selectedSegment: data.analysis.customerSegments?.[0]?.name,
            refinedProblem: structuredFormData?.problemStatement || '',
            pmfScore: data.analysis.pmfScore?.overall,
            experiments: data.analysis.validationExperiments,
          });
        }

        toast({
          title: "Analysis Complete!",
          description: `Your PMF score is ${data.analysis.pmfScore?.overall || 'N/A'}/100 - ${data.analysis.pmfScore?.verdict || 'N/A'}. Review the insights below.`,
        });
      } else {
        throw new Error(data?.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('Error analyzing PMF:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Failed to analyze PMF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };


  return (
    <div className="space-y-6">
      <CreditGate
        isOpen={creditGateOpen}
        onClose={() => setCreditGateOpen(false)}
        requiredCredits={CREDIT_COSTS.PMF_ANALYSIS}
        feature="PMF Analysis"
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Product Market Fit Lab
          </CardTitle>
          <CardDescription>
            Validate your product in the market and discover if there's real demand
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="input">
                <FileText className="w-4 h-4 mr-2" />
                Input
              </TabsTrigger>
              <TabsTrigger value="segments">
                <Users className="w-4 h-4 mr-2" />
                Segments
              </TabsTrigger>
              <TabsTrigger value="fit">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Fit
              </TabsTrigger>
              <TabsTrigger value="experiments">
                <FlaskConical className="w-4 h-4 mr-2" />
                Experiments
              </TabsTrigger>
              <TabsTrigger value="score">
                <TrendingUp className="w-4 h-4 mr-2" />
                Score
              </TabsTrigger>
            </TabsList>

            <TabsContent value="input" className="mt-6">
              {businessPlanData && (
                <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border-l-4 border-primary mb-6">
                  <p className="font-medium text-primary mb-1">✓ Business Plan Data Loaded</p>
                  <p>Your business plan information has been pre-filled. You can edit or add more context.</p>
                </div>
              )}
              <PMFInputForm
                initialData={structuredFormData}
                businessPlanData={businessPlanData}
                onSubmit={handleStructuredFormSubmit}
                isSubmitting={isAnalyzing}
              />
            </TabsContent>

            <TabsContent value="segments" className="mt-6">
              {analysis ? (
                <CustomerSegments
                  segments={analysis.customerSegments}
                  selectedSegment={selectedSegment}
                  onSelectSegment={setSelectedSegment}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      Run a PMF analysis first to see your customer segments. Go to the Input tab and click "Analyze Product-Market Fit".
                    </p>
                    <Button onClick={() => setActiveTab('input')}>
                      Go to Input
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="fit" className="mt-6">
              {analysis && analysis.problemSolutionFit && analysis.surveys && analysis.interviewScripts ? (
                <ProblemSolutionFit
                  fit={analysis.problemSolutionFit}
                  surveys={analysis.surveys}
                  interviewScripts={analysis.interviewScripts}
                  onExportSurvey={handleExportSurvey}
                  onExportInterviewScript={handleExportInterviewScript}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      Run a PMF analysis first to see problem-solution fit insights. Go to the Input tab and click "Analyze Product-Market Fit".
                    </p>
                    <Button onClick={() => setActiveTab('input')}>
                      Go to Input
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="experiments" className="mt-6">
              {analysis ? (
                <ValidationExperiments
                  experiments={analysis.validationExperiments}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      Run a PMF analysis first to see validation experiments. Go to the Input tab and click "Analyze Product-Market Fit".
                    </p>
                    <Button onClick={() => setActiveTab('input')}>
                      Go to Input
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="score" className="mt-6">
              {analysis ? (
                <PMFScore
                  score={analysis.pmfScore}
                  nextSteps={analysis.nextSteps}
                  analysis={analysis}
                  analysisId={analysisId}
                />
              ) : (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                    <Target className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">No Analysis Yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md">
                      Run a PMF analysis first to see your PMF score. Go to the Input tab and click "Analyze Product-Market Fit".
                    </p>
                    <Button onClick={() => setActiveTab('input')}>
                      Go to Input
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductMarketFitLab;

